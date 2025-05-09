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
    
    
    const body = await request.json().catch(e => {
      console.error("Failed to parse request JSON:", e);
      return {};
    });
    
    const { verification_method, thread_id, id } = body;
    
    if (!verification_method) {
      return NextResponse.json(
        { error: "Missing required field: verificationMethod is required" },
        { status: 400 }
      );
    }
    
    let userProcess = null;
    
    if (auth.role === Roles.Admin) {
      userProcess = await prisma.userProcess.findFirst({
        where: {
          status: {
            in: [ProcessStatus.PROCESSING, ProcessStatus.PENDING]
          }
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
          status: {
            in: [ProcessStatus.PROCESSING, ProcessStatus.PENDING]
          }
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
    
    
    // Prepare headers
    const headers = await preparePythonBackendHeaders(
      userProcess.user_id,
      userProcess.id,
      role
    );
    
    // Prepare request data
    const requestData = {
      verification_method: verification_method,  
      thread_id: thread_id
    };
    
    try {
      // Check if the URL is properly formatted
      const backendUrl = `${process.env.EXTERNAL_APP_URL}submit-verification-option`;

      // Send request to Python backend
      const backendResponse = await fetch(backendUrl, {
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
        } catch (e) {
          console.error("Failed to parse error response:", e);
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

      //set the timeout to 0 if the form is submitted
     const processProgressData = await prisma.processProgress.findUnique({
      where: { 
        id
      },  
      select: { 
        data: true 
      }
    })
    let newProcessProgressData = JSON.parse(JSON.stringify(processProgressData))  
    newProcessProgressData.data.timeout =  0;  

    await prisma.processProgress.update({
      where: {id}, 
      data: { 
        data: newProcessProgressData
      }
    })
      
      return NextResponse.json({
        success: true,
        message: "Verification method submitted successfully",
        process_id: userProcess.id,
        details: responseData
      });
    } catch (error: any) {
      console.error("Error submitting verification method to backend:", error);
      
      return NextResponse.json(
        {
          error: "Failed to communicate with backend service",
          message: error.message
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error("Uncaught error in API route handler:", error);
    
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}