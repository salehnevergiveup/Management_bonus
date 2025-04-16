import { prisma } from "@/lib/prisma";
import crypto from 'crypto';

export const verifyApi = async (request: Request, requiredPermission?: string) => {
  const apiKey = request.headers.get('X-API-Key');
  const userId = request.headers.get('X-User-ID');
  const processId = request.headers.get('X-Process-ID');
  
  // Check API key presence
  if (!apiKey) {
    return { 
      valid: false, 
      error: "Missing API key",
      status: 401
    };
  }
  
  // Check user ID and process ID presence
  if (!userId) {
    return {
      valid: false,
      error: "Missing X-User-ID header",
      status: 400
    };
  }
  
  if (!processId) {
    return {
      valid: false,
      error: "Missing X-Process-ID header",
      status: 400
    };
  }
  
  // Validate API key
  const keyRecord = await prisma.aPIKey.findFirst({
    where: {
      token: apiKey
    },
    include: {
      APIKeyPermission: {
        include: {
          permission: true
        }
      }
    }
  });
  
  if (!keyRecord) {
    return { 
      valid: false, 
      error: "Invalid API key",
      status: 401
    };
  }
  
  if (keyRecord.is_revoked) {
    return { 
      valid: false, 
      error: "API key has been revoked",
      status: 403
    };
  }
  
  if (new Date() > new Date(keyRecord.expires_at)) {
    return { 
      valid: false, 
      error: "API key has expired",
      status: 401,
      application: keyRecord.application,
      keyId: keyRecord.id,
      expired: true
    };
  }
  
  // Verify permissions
  const permissions = keyRecord.APIKeyPermission.map(p => p.permission.name);
  
  if (requiredPermission && !permissions.includes(requiredPermission)) {
    return {
      valid: false,
      error: `Missing required permission: ${requiredPermission}`,
      status: 403,
      application: keyRecord.application,
      keyId: keyRecord.id
    };
  }
  
  // Verify that the user and process exists and the user linked to the process
  const user_processes = await prisma.user.findUnique({
    where: { id: userId },  
    include:  {  
      user_processes: {  
        where: {id: processId},
        select:  {  
          id: true
        }
      }
    }
  });
  
  if (!user_processes) {
    return {
      valid: false,
      error: `User with ID ${userId} not found`,
      status: 404
    };
  }
  
  if(!user_processes.user_processes) {  
    return {
      valid: false,
      error: `process with ID ${processId} not found`,
      status: 404
    };
  }

  return {
    valid: true,
    keyId: keyRecord.id,
    application: keyRecord.application,
    permissions,
    userId: userId,  
    processId: processId  
  };
};

export const verifyRenew = async (request: Request, requiredPermission?: string) => {
  const apiKey = request.headers.get('X-API-Key');
  
  if (!apiKey) {
    return { 
      valid: false, 
      error: "Missing API key",
      status: 401
    };
  }
  
  const keyRecord = await prisma.aPIKey.findFirst({
    where: {
      token: apiKey
    },
    include: {
      APIKeyPermission: {
        include: {
          permission: true
        }
      }
    }
  });
  
  if (!keyRecord) {
    return { 
      valid: false, 
      error: "Invalid API key",
    status: 401
    };
  }
  
  if (keyRecord.is_revoked) {
    return { 
      valid: false, 
      error: "API key has been revoked",
      status: 403
    };
  }
  
  const permissions = keyRecord.APIKeyPermission.map(p => p.permission.name);
  
  if (requiredPermission && !permissions.includes(requiredPermission)) {
    return {
      valid: false,
      error: `Missing required permission: ${requiredPermission}`,
      status: 403,
      application: keyRecord.application,
      keyId: keyRecord.id
    };
  }

  return {
    valid: true,
    keyId: keyRecord.id,
    application: keyRecord.application,
    permissions
  };
};

type ApiKeyRenewalSuccess = {
  success: true;
  token: string;
  expires_at: Date;
  application: string;
};

type ApiKeyRenewalFailure = {
  success: false;
  error: string;
};

type ApiKeyRenewalResult = ApiKeyRenewalSuccess | ApiKeyRenewalFailure;

export const renewApiKey = async (keyId: string): Promise<ApiKeyRenewalResult> => {
  try {
    const keyRecord = await prisma.aPIKey.findUnique({
      where: {
        id: keyId
      }
    });
    
    if (!keyRecord) {
      return {
        success: false,
        error: "API key not found"
      };
    }
    
    if (keyRecord.is_revoked) {
      return {
        success: false,
        error: "Cannot renew a revoked API key"
      };
    }
    
    const newToken = crypto.randomBytes(32).toString('hex');
   
    const newExpiration = new Date();
    newExpiration.setDate(newExpiration.getDate() + 90);
    
    const updatedKey = await prisma.aPIKey.update({
      where: {
        id: keyId
      },
      data: {
        token: newToken,
        expires_at: newExpiration
      }
    });
    
    return {
      success: true,
      token: newToken,
      expires_at: updatedKey.expires_at,
      application: updatedKey.application
    };
  } catch (error) {
    console.error("Error renewing API key:", error);
    return {
      success: false,
      error: "Failed to renew API key"
    };
  }
};


export const preparePythonBackendHeaders = async (
  userId: string,
  processId: string,
  role: string,  
  customHeaders: Record<string, string> = {}
): Promise<Record<string, string>> => {
  try {
    const apiKeyRecord = await prisma.aPIKey.findFirst({
      where: {
        application: "automation",
        is_revoked: false
      }
    });

    if (!apiKeyRecord) {
      throw new Error("No valid API key found for automation application");
    }

    if (new Date() > new Date(apiKeyRecord.expires_at)) {
      const renewalResult = await renewApiKey(apiKeyRecord.id);
      
      if (!renewalResult.success) {
        throw new Error(`Failed to renew API key: ${renewalResult.error}`);
      }
      
      return {
        'Content-Type': 'application/json',
        'X-API-Key': renewalResult.token,
        'X-User-ID': userId,
        'X-Process-ID': processId,
        'X-Expires': renewalResult.expires_at.toISOString(),
        'X-Role': role, 
        ...customHeaders
      };
    }

    return {
      'Content-Type': 'application/json',
      'X-API-Key': apiKeyRecord.token,
      'X-User-ID': userId,
      'X-Process-ID': processId,
      'X-Expires': apiKeyRecord.expires_at.toISOString(),
      'X-Role': role, 
      ...customHeaders
    };
  } catch (error) {
    console.error("Error preparing Python backend headers:", error);
    throw error;
  }
};