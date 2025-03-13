import { NextRequest, NextResponse } from 'next/server';
import { ProcessStatus } from "@/constants/enums"
import {prisma} from "@/lib/prisma";
import crypto from 'crypto';
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
    
    const { identifier, password, verificationMethod } = await request.json();
    
    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    const userProcess = await prisma.userProcess.findFirst({
      where: {
        user_id: userId,
        status: ProcessStatus.PROCESSING
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
    
    const timestamp = Date.now().toString();
    const payload = {
      process_id: userProcess.id,
      user_id: userId,
      action: 'submit_credentials',
      credentials: {
        identifier,
        password,
        verification_method: verificationMethod
      },
      timestamp
    };
    
    const payloadString = JSON.stringify(payload);
    
    const signature = crypto
      .createHmac('sha256', process.env.SHARED_SECRET || '')
      .update(payloadString)
      .digest('hex');
    
    try {
      const externalResponse = await fetch(`${process.env.EXTERNAL_APP_URL}/api/process/credentials`, {
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
            error: "Failed to submit credentials to external service",
            details: errorText
          },
          { status: 502 }
        );
      }
      
      const responseData = await externalResponse.json();
      console.log(responseData);
      return NextResponse.json({
        success: true,
        message: "Credentials submitted successfully",
        details: responseData
      });
    } catch (error: any) {
      console.error("Error submitting credentials:", error);
      return NextResponse.json(
        { error: "Failed to communicate with external service", message: error.message },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error("Error processing credential submission:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}