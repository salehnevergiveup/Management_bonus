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
    
    const { verificationMethod, thread_id } = await request.json();
    
    if (!verificationMethod) {
      return NextResponse.json(
        { error: "Missing required field: verificationMethod is required" },
        { status: 400 }
      );
    }
    
    let userProcess = null;
    
    if (auth.role === Roles.Admin) {
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
    
    console.log("this  is the process id sent back: ", userProcess.id)
    // Prepare headers
    const headers = await preparePythonBackendHeaders(
      userProcess.user_id, // Use the process owner's user ID, not always the current user
      userProcess.id,
      role
    );

    // Prepare request data - only sending verification_method now
    const requestData = {
      verification_method: verificationMethod,  
      thread_id: thread_id
    };
    
    try {
      // Send request to Python backend with updated endpoint
      const backendResponse = await fetch(`http://127.0.0.1:8000/api/submit-verification-method`, {
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
            error: "Failed to submit verification method to backend service",
            details: errorDetails
          },
          { status: backendResponse.status }
        );
      }
      
      const responseData = await backendResponse.json();
      
      return NextResponse.json({
        success: true,
        message: "Verification method submitted successfully",
        process_id: userProcess.id,
        details: responseData
      });
    } catch (error: any) {
      console.error("Error submitting verification method:", error);
      
      return NextResponse.json(
        {
          error: "Failed to communicate with backend service",
          message: error.message
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error("Error processing verification method submission:", error);
    
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}