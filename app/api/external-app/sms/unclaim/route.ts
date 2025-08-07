import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyExternalApi } from "@/lib/externalApiAuth";
import { smsRateLimiter } from "@/lib/smsRateLimiter";

interface SmsRecord {
  phoneNo: string;
  [key: string]: any; 
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-User-ID, X-Process-ID',
      'Access-Control-Max-Age': '86400',
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    // Verify API key authentication
    const apiKeyVerification = await verifyExternalApi(request, "sms-send");
    
    if (!apiKeyVerification.valid) {
      return NextResponse.json(
        { error: apiKeyVerification.error },
        { status: apiKeyVerification.status }
      );
    }

    // Check if the application is "loyalty app"
    if (apiKeyVerification.application !== "loyalty app") {
      return NextResponse.json(
        { error: "Unauthorized: Only loyalty app can send SMS" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate that body is an array
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be an array of SMS records" },
        { status: 400 }
      );
    }

    // Validate request size
    const sizeValidation = smsRateLimiter.validateRequestSize(body.length);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 400 }
      );
    }

    // Check concurrent request limits
    const concurrentValidation = smsRateLimiter.checkConcurrentLimit();
    if (!concurrentValidation.valid) {
      return NextResponse.json(
        { error: concurrentValidation.error },
        { status: 429 }
      );
    }

    // Check rate limiting per API key
    const apiKey = request.headers.get('X-API-Key') || '';
    const rateLimitValidation = smsRateLimiter.checkRateLimit(apiKey);
    if (!rateLimitValidation.valid) {
      return NextResponse.json(
        { error: rateLimitValidation.error },
        { status: 429 }
      );
    }

    // Validate each record
    const records: SmsRecord[] = body;
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (!record.phoneNo) {
        return NextResponse.json(
          { error: `Record at index ${i} is missing phoneNo` },
          { status: 400 }
        );
      }
    }

    // Start tracking this request
    smsRateLimiter.startRequest();

    // Start background processing
    processSmsInBackground(records, 'unclaim');

    // Return immediate response
    return NextResponse.json({
      success: true,
      message: "SMS sending process started successfully",
      summary: {
        total_records: records.length,
        status: "processing"
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-User-ID, X-Process-ID',
        'Access-Control-Max-Age': '86400',
      }
    });

  } catch (error) {
    console.error("[ERROR] Voucher SMS endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Background processing function
async function processSmsInBackground(records: SmsRecord[], endpointName: string) {
  try {
    let totalSent = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        // Use SMS service to validate and format Malaysian phone number
        const smsService = (await import('@/lib/smsService')).smsService;
        const formattedPhone = smsService.validatePhoneNumber(record.phoneNo);

        let message = `RM0 WB

Dear ${record.playerId || 'Player'},
Claim WINBOX Extra B O N U S  credit now!

Balance: ${record.unclaimAmount || '0'}`;
        
        // Add any additional dynamic fields before claim (excluding phoneNo, playerId, unclaimAmount)
        const additionalFields = Object.keys(record).filter(key => 
          key !== 'phoneNo' && key !== 'playerId' && key !== 'unclaimAmount' &&
          record[key] !== undefined && record[key] !== null && record[key] !== ''
        );
        
        if (additionalFields.length > 0) {
          additionalFields.forEach(field => {
            message += `\n${field}: ${record[field]}`;
          });
        }
        
        message += `

Claim: 
E X T R A B O N U S 8 8. com`;

        // DEBUG: Show message format
        console.log(`[SMS DEBUG] Unclaim Message for ${formattedPhone}:`);
        console.log(message);
        console.log(`[SMS DEBUG] Message length: ${message.length} characters`);

        // Send the message using the validated phone number
        const success = await smsService.sendSms(formattedPhone, message);
        
        if (success) {
          totalSent++;
        } else {
          errors.push(`Failed to send SMS to ${formattedPhone}`);
        }

      } catch (error) {
        errors.push(`Failed to send SMS to ${record.phoneNo}: ${error}`);
        // Continue with next record - don't stop the entire process
      }
    }

    // Log the batch summary
    try {
      await prisma.smsSendLog.create({
        data: {
          endpoint_name: endpointName,
          total_sent: totalSent
        }
      });
    } catch (dbError) {
      console.error("[ERROR] Failed to log SMS batch:", dbError);
    }

  } catch (error) {
    console.error(`[ERROR] Background SMS processing error:`, error);
  } finally {
    // End tracking this request
    smsRateLimiter.endRequest();
  }
}
