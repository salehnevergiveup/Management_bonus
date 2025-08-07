import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

interface SmsRecord {
  phone_number: string;
  [key: string]: any; 
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate that body is an array
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be an array of SMS records" },
        { status: 400 }
      );
    }

    // Validate each record
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

    // Start background processing
    processSmsInBackground(records, 'voucher');

    // Return immediate response
    return NextResponse.json({
      success: true,
      message: "SMS sending process started successfully",
      summary: {
        total_records: records.length,
        status: "processing"
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

Claim WINBOX Extra B0nus credit now!

Balance: ${record.unclaimAmount || '0'}`;
        
        // Add any additional dynamic fields before claim (excluding phone_number, UID, unclaimAmount)
        const additionalFields = Object.keys(record).filter(key => 
          key !== 'phone_number' && key !== 'UID' && key !== 'unclaimAmount' &&
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

    // Log the batch summary
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
