import { NextRequest, NextResponse } from 'next/server';
import { ProcessStatus, Roles } from "@/constants/enums";
import { prisma } from "@/lib/prisma";
import { SessionValidation } from '@/lib/sessionvalidation';
import { preparePythonBackendHeaders } from '@/lib/apikeysHandling';

export async function POST(request: NextRequest) {
  try {
    const auth = await SessionValidation();
    
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: User must be logged in" },
        { status: 401 }
      );
    }
    
    const { code, thread_id } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Missing verification code" },
        { status: 400 }
      );
    }
    
    let userProcess = null;
    
    if (auth.role === Roles.Admin) {
      // For admin: find the first active process in the system
      userProcess = await prisma.userProcess.findFirst({
        where: {
          status: ProcessStatus.PROCESSING
        },
        include: {
          user: {
            include: {
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });
    } else {
      // For regular user: find their own active process
      userProcess = await prisma.userProcess.findFirst({
        where: {
          user_id: auth.id,
          status: ProcessStatus.PROCESSING
        },
        orderBy: {
          created_at: 'desc'
        }
      });
    }
    
    if (!userProcess) {
      return NextResponse.json(
        { error: "No active process found" },
        { status: 404 }
      );
    }
    
    let role = auth.role;
    if (auth.role !== Roles.Admin) {
      const user = await prisma.user.findUnique({
        where: { id: auth.id },
        include: { role: true }
      });
      
      if (user && user.role) {
        role = user.role.name;
      }
    }
    
    const headers = await preparePythonBackendHeaders(
      userProcess.user_id,
      userProcess.id,
      role
    );
    
    const requestData = {
      verification_code: code,  
      thread_id: thread_id
    };
    
    try {
      const backendResponse = await fetch(`${process.env.EXTERNAL_APP_URL}/submit-verification`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!backendResponse.ok) {
        let errorDetails;
        try {
          errorDetails = await backendResponse.json();
        } catch {
          errorDetails = { error: "Unknown error from backend service" };
        }
        
        return NextResponse.json(
          { 
            error: "Failed to submit verification code to backend service",
            details: errorDetails
          },
          { status: backendResponse.status }
        );
      }
      
      const responseData = await backendResponse.json();
      
      return NextResponse.json({
        success: true,
        message: "Verification code submitted successfully",
        process_id: userProcess.id,
        details: responseData
      });
    } catch (error: any) {
      console.error("Error submitting verification code:", error);
      
      return NextResponse.json(
        { 
          error: "Failed to communicate with backend service", 
          message: error.message 
        },
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