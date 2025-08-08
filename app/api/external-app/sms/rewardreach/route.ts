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

    // Parse request body with error handling
    let body;
    try {
      const bodyText = await request.text();
      console.log("[DEBUG] Request body length:", bodyText?.length || 0);
      console.log("[DEBUG] Request body preview:", bodyText?.substring(0, 200) || "empty");
      
      if (!bodyText || bodyText.trim() === '') {
        console.error("[ERROR] Request body is empty");
        return NextResponse.json(
          { error: "Request body is empty" },
          { status: 400 }
        );
      }
      body = JSON.parse(bodyText);
    } catch (parseError) {
      console.error("[ERROR] Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate that body is an array
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be an array of SMS records" },
        { status: 400 }
      );
    }

    const records: SmsRecord[] = body;
    
    // Validate request size
    const sizeValidation = smsRateLimiter.validateRequestSize(records.length);
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

    processSmsInBackground(records, 'rewardreach');

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
    console.error("[ERROR] Rewards SMS endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function processSmsInBackground(records: SmsRecord[], endpointName: string) {
  try {
    let totalSent = 0;
    const errors: string[] = [];

    for (const record of records) {
      try {
        // Use SMS service to validate and format Malaysian phone number
        const smsService = (await import('@/lib/smsService')).smsService;
        const formattedPhone = smsService.validatePhoneNumber(record.phoneNo);

        // Get active message from database
        const activeMessageResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sms-messages/active/rewardreach`);
        const activeMessageData = await activeMessageResponse.json();
        
        let message: string;
        if (activeMessageData.success && activeMessageData.data) {
          // Use dynamic message from database
          const { processMessage } = await import('@/lib/messageProcessor');
          message = processMessage(activeMessageData.data.message, record);
          
          // Debug logging
          console.log('[SMS DEBUG] Rewardreach Message Processing:');
          console.log('- Template:', activeMessageData.data.message);
          console.log('- Data:', record);
          console.log('- Processed Message:', message);
        } else {
          throw new Error('No active message found for rewardreach endpoint');
        }

        // DEBUG: Show message format
        console.log(`[SMS DEBUG] Rewardreach Message for ${formattedPhone}:`);
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
