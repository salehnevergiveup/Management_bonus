import { NextRequest, NextResponse } from 'next/server';
import { ProcessStatus, Roles } from "@/constants/enums";
import { prisma } from "@/lib/prisma";
import { SessionValidation } from '@/lib/sessionvalidation';
import { preparePythonBackendHeaders } from '@/lib/apikeysHandling';

export async function POST(request: NextRequest) {
  console.log("API route handler called: /api/external/submit-verification-method");
  
  try {
    console.log("Validating session...");
    const auth = await SessionValidation();
    
    if (!auth) {
      console.log("Session validation failed: Unauthorized");
      return NextResponse.json(
        { error: "Unauthorized: User must be logged in" },
        { status: 401 }
      );
    }
    
    console.log("Session validated successfully:", auth.id);
    
    console.log("Parsing request body...");
    const body = await request.json().catch(e => {
      console.error("Failed to parse request JSON:", e);
      return {};
    });
    
    console.log("Received request body:", body);
    const { verification_method, thread_id } = body;
    
    if (!verification_method) {
      console.log("Validation error: Missing verificationMethod");
      return NextResponse.json(
        { error: "Missing required field: verificationMethod is required" },
        { status: 400 }
      );
    }
    
    console.log("Finding active user process...");
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
      console.log("No active process found for user:", auth.id);
      return NextResponse.json(
        { error: "No active process found" },
        { status: 404 }
      );
    }
    
    console.log("Found active process:", userProcess.id);
    
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
    
    console.log("User role:", role);
    console.log("This is the process id sent back:", userProcess.id);
    
    // Prepare headers
    console.log("Preparing headers for Python backend...");
    const headers = await preparePythonBackendHeaders(
      userProcess.user_id,
      userProcess.id,
      role
    );
    
    console.log("Headers prepared:", Object.keys(headers));

    // Prepare request data
    const requestData = {
      verification_method: verification_method,  
      thread_id: thread_id
    };
    
    console.log("Sending request to Python backend:", requestData);
    
    try {
      // Check if the URL is properly formatted
      const backendUrl = `${process.env.EXTERNAL_APP_URL}submit-verification-option`;
      console.log("Backend URL:", backendUrl);
      
      // Send request to Python backend
      const backendResponse = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      console.log("Backend response status:", backendResponse.status);
      
      if (!backendResponse.ok) {
        console.log("Backend response error:", backendResponse.status);
        let errorDetails;
        try {
          errorDetails = await backendResponse.json();
          console.log("Error details:", errorDetails);
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
      
      console.log("Backend request successful");
      const responseData = await backendResponse.json();
      console.log("Backend response data:", responseData);
      
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