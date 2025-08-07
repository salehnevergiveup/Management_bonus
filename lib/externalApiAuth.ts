import { prisma } from "@/lib/prisma";

export const verifyExternalApi = async (request: Request, requiredPermission?: string) => {
  const apiKey = request.headers.get('X-API-Key');
  
  // Check API key presence
  if (!apiKey) {
    return { 
      valid: false, 
      error: "Missing API key",
      status: 401
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

  return {
    valid: true,
    keyId: keyRecord.id,
    application: keyRecord.application,
    permissions
  };
}; 