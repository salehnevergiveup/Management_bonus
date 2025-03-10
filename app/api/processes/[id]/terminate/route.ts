import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { getServerSession } from "next-auth";
import { ProcessStatus } from "@/constants/processStatus";
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: User must be logged in" },
        { status: 401 }
      );
    }
    
    const requestClone = await request.clone().json();
    const processId = requestClone.process_id as string;
    
    if (!processId) {
      return NextResponse.json(
        { error: "Missing process_id in request" },
        { status: 400 }
      );
    }
    
    // Get the process and its associated token
    const databaseProcess = await prisma.userProcess.findUnique({
      where: { id: processId }
    });
    
    if (!databaseProcess) {
      return NextResponse.json(
        { error: "Process not found" },
        { status: 404 }
      );
    }
    
    const token = await prisma.processToken.findFirst({
      where: {
        process_id: processId,
        isComplete: false
      }
    });
    
    if (!token) {
      return NextResponse.json(
        { error: "No active token found for this process" },
        { status: 400 }
      );
    }
    
    // Create the payload for the external app
    const timestamp = Date.now().toString();
    const payload = {
      process_id: processId,
      action: 'terminate',
      user_id: session.user.id,
      timestamp
    };
    
    const payloadString = JSON.stringify(payload);
    
    const signature = crypto
      .createHmac('sha256', process.env.SHARED_SECRET || '')
      .update(payloadString)
      .digest('hex');
    
    // Send termination request to external app
    try {
      const externalResponse = await fetch(`${process.env.EXTERNAL_APP_URL}/api/process/shutdown`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.API_KEY || '',
          'X-Token': token.token,
          'X-Timestamp': timestamp,
          'X-Signature': signature
        },
        body: payloadString
      });
      
      if (!externalResponse.ok) {
        const errorText = await externalResponse.text();
        return NextResponse.json(
          { 
            error: "Failed to terminate process with external service",
            details: errorText
          },
          { status: 502 }
        );
      }
      
      await prisma.processToken.update({
        where: { token: token.token },
        data: { isComplete: true }
      });
      
      const updatedProcess = await prisma.userProcess.update({
        where: { id: processId },
        data: {
          status: ProcessStatus.FAILED,
          end_time: new Date()
        }
      });
      
      return NextResponse.json({
        success: true,
        message: "Process terminated successfully",
        process: updatedProcess
      });
    } catch (error) {
      console.error("Error terminating process:", error);
      return NextResponse.json(
        { error: "Failed to communicate with external service" },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Error in process termination:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}