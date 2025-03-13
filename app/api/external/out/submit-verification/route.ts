import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { ProcessStatus } from "@/constants/enums"
import {prisma} from "@/lib/prisma";
import { SessionValidation } from '@lib/sessionvalidation';

export async function POST(request: NextRequest) {
  try {
    const auth = await SessionValidation();
      
    if (!auth) {
      return NextResponse.json(
        {}, 
        {status: 401}
      );
    }

    const userId = auth.id;
    
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { error: "Missing verification code" },
        { status: 400 }
      );
    }
    
    // Find process with PROCESSING status for this user
    const userProcess = await prisma.userProcess.findFirst({
      where: {
        user_id: userId,
        status:  ProcessStatus.PROCESSING
      },
      orderBy: {
        created_at: 'desc'
      },
      include: {
        tokens: {
          where: {
            isComplete: false
          },
          take: 1
        }
      }
    });
    
    if (!userProcess || userProcess.tokens.length === 0) {
      return NextResponse.json(
        { error: "No active process token found" },
        { status: 404 }
      );
    }
    
    const token = userProcess.tokens[0].token;
    
    // Prepare the payload for Application B
    const timestamp = Date.now().toString();
    const payload = {
      process_id: userProcess.id,
      user_id: userId,
      action: 'submit_verification',
      verification: {
        code
      },
      timestamp
    };
    
    // Convert to JSON
    const payloadString = JSON.stringify(payload);
    
    // Create signature
    const signature = crypto
      .createHmac('sha256', process.env.SHARED_SECRET || '')
      .update(payloadString)
      .digest('hex');
    
    // Send the verification code to Application B
    try {
    
      const externalResponse = await fetch( `${process.env.EXTERNAL_APP_URL}/api/process/verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.API_KEY || '',
          'X-Token': token,
          'X-Timestamp': timestamp,
          'X-Signature': signature
        },
        body: payloadString
      });
      
      if (!externalResponse.ok) {
        const errorText = await externalResponse.text();
        return NextResponse.json(
          { 
            error: "Failed to submit verification code to external service",
            details: errorText
          },
          { status: 502 }
        );
      }
      
      const responseData = await externalResponse.json();
      
      return NextResponse.json({
        success: true,
        message: "Verification code submitted successfully",
        details: responseData
      });
    } catch (error: any) {
      console.error("Error submitting verification code:", error);
      
        await prisma.userProcess.update({
          where: { id: userProcess.id },
          data: { 
            status: ProcessStatus.FAILED,
            end_time: new Date()
          }
        });

      return NextResponse.json(
        { error: "Failed to communicate with external service", message: error.message },
        { status: 503 }
      );
      
    }
  } catch (error: any) {
    console.error("Error processing verification submission:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}