import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyExternalApi } from "@/lib/externalApiAuth";

interface SmsRecord {
  phone_number: string;
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

    const body = await request.json();
    
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be an array of SMS records" },
        { status: 400 }
      );
    }

    const records: SmsRecord[] = body;
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (!record.phone_number) {
        return NextResponse.json(
          { error: `Record at index ${i} is missing phone_number` },
          { status: 400 }
        );
      }
    }

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

    console.log(`[SMS] Starting background processing for ${records.length} records`);

    for (const record of records) {
      try {
        let formattedPhone = record.phone_number;
        if (!formattedPhone.startsWith('60')) {
          formattedPhone = formattedPhone.replace(/^0+/, '');
          if (!formattedPhone.startsWith('60')) {
            formattedPhone = `60${formattedPhone}`;
          }
        }

        let message = `Dear ${record.UID || 'User'},

Claim WINBOX Extra B0nus credit now!`;
        
        // Add any additional dynamic fields before claim
        const additionalFields = Object.keys(record).filter(key => 
          key !== 'phone_number' && key !== 'UID' && 
          record[key] !== undefined && record[key] !== null && record[key] !== ''
        );
        
        if (additionalFields.length > 0) {
          additionalFields.forEach(field => {
            message += `\n${field}: ${record[field]}`;
          });
        }
        
        message += `

Claim:
Extrabonus88.com`;

        console.log(`[SMS] Sending to ${formattedPhone}: ${message}`);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        totalSent++;
        
      } catch (error) {
        const errorMsg = `Failed to send SMS to ${record.phone_number}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    try {
      await prisma.smsSendLog.create({
        data: {
          endpoint_name: endpointName,
          total_sent: totalSent
        }
      });
      console.log(`[SMS] Background processing completed. Total sent: ${totalSent}, Errors: ${errors.length}`);
    } catch (dbError) {
      console.error("[ERROR] Failed to log SMS batch:", dbError);
    }

  } catch (error) {
    console.error(`[ERROR] Background SMS processing error:`, error);
  }
}
