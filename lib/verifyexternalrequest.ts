import { PrismaClient } from "@prisma/client";
import crypto from 'crypto';


const prisma = new PrismaClient();

export const verifyExternalRequest = async (request: Request) => {

  const apiKey = request.headers.get('X-API-Key');
  const signature = request.headers.get('X-Signature');
  const timestamp = request.headers.get('X-Timestamp');
  const token = request.headers.get('X-Token');

  if (apiKey !== process.env.API_KEY) {
    return { valid: false, error: "Invalid API key" };
  }

  // Validate timestamp to prevent replay attacks
  // Allow a 5-minute window to account for clock differences
  const requestTime = parseInt(timestamp || '0');
  if (Date.now() - requestTime > 5 * 60 * 1000) {
    return { valid: false, error: "Request expired" };
  }

  if (!token) {
    return { valid: false, error: "Missing authentication token" };
  }

  const tokenRecord = await prisma.processToken.findUnique({
    where: { token }
  });

  if (!tokenRecord) {
    return { valid: false, error: "Invalid authentication token" };
  }

  if (tokenRecord.isComplete) {
    return { valid: false, error: "Process already completed" };
  }

  if (new Date() > tokenRecord.expires) {
    return { valid: false, error: "Authentication token expired" };
  }

  const clonedRequest = request.clone();
  const bodyText = await clonedRequest.text();
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.SHARED_SECRET || '')
    .update(bodyText)
    .digest('hex');

  if (signature !== expectedSignature) {
    return { valid: false, error: "Invalid signature" };
  }

  return { 
    valid: true, 
    userId: tokenRecord.user_id,
    processId: tokenRecord.process_id,
    token: tokenRecord.token
  };
}


export const GenerateToken = async (userId: string,  processId :string) => {
  // Generate token data
  const token = crypto.randomBytes(32).toString('hex');
  const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const timeStamp = new Date().toISOString();
  
  const result = await prisma.$transaction(async (tx) => {
    await tx.processToken.updateMany({
      where: {
        process_id: processId,
        isComplete: false
      },
      data: {
        isComplete: true
      }
    });
    
    const newToken = await tx.processToken.create({
      data: {
        token,
        process_id: processId,
        user_id: userId,
        expires: expirationTime,
        isComplete: false
      }
    });
    
    return newToken;
  });
  
  return {
    token,
    expirationTime,
    timeStamp,
    tokenRecord: result
  };
};

//generate Signature  
export const Signature =  (payload: any, token: string, timestamp: string) =>  {  
  const data = JSON.stringify({
   ...payload,  
   token,  
   timestamp
   });  
  const signature =  crypto
                    .createHmac('sha256', process.env.SHARED_SECRET || '')
                    .update(data)
                    .digest('hex');  

   return signature;                     
}

