import { PrismaClient } from "@prisma/client";
import crypto from 'crypto';


const prisma = new PrismaClient();

export const verifyExternalRequest = async (request: Request) => {
  // Extract authentication headers
  const apiKey = request.headers.get('X-API-Key');
  const signature = request.headers.get('X-Signature');
  const timestamp = request.headers.get('X-Timestamp');
  const token = request.headers.get('X-Token');

  // Validate API key
  if (apiKey !== process.env.API_KEY) {
    return { valid: false, error: "Invalid API key" };
  }

  // Validate timestamp to prevent replay attacks
  // Allow a 5-minute window to account for clock differences
  const requestTime = parseInt(timestamp || '0');
  if (Date.now() - requestTime > 5 * 60 * 1000) {
    return { valid: false, error: "Request expired" };
  }

  // Validate token
  if (!token) {
    return { valid: false, error: "Missing authentication token" };
  }

  // Find token in database
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

  // Get and validate request body
  const clonedRequest = request.clone();
  const bodyText = await clonedRequest.text();
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.SHARED_SECRET || '')
    .update(bodyText)
    .digest('hex');

  if (signature !== expectedSignature) {
    return { valid: false, error: "Invalid signature" };
  }

  // Authentication successful
  return { 
    valid: true, 
    userId: tokenRecord.user_id,
    processId: tokenRecord.process_id,
    token: tokenRecord.token
  };
}