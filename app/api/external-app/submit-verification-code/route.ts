import { NextRequest, NextResponse } from 'next/server';
import { ProcessStatus, Roles } from "@/constants/enums";
import { prisma } from "@/lib/prisma";
import { SessionValidation } from '@/lib/sessionvalidation';
import { preparePythonBackendHeaders } from '@/lib/apikeysHandling';

export async function POST(request: NextRequest) {
  try {
    console.log("[DEBUG] Starting POST /submit-verification-code");
    
    const auth = await SessionValidation();
    console.log("[DEBUG] Authenticated user:", auth);
    
    if (!auth) {
      console.warn("[WARN] Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized: User must be logged in" },
        { status: 401 }
      );
    }
    
    const { code, thread_id } = await request.json();
    console.log("[DEBUG] Received payload:", { code, thread_id });

    if (!code) {
      console.warn("[WARN] Missing verification code");
      return NextResponse.json(
        { error: "Missing verification code" },
        { status: 400 }
      );
    }
    
    let userProcess = null;
    
    if (auth.role === Roles.Admin) {
      console.log("[DEBUG] User is admin, fetching latest active process");
      userProcess = await prisma.userProcess.findFirst({
        where: {
          status:{
            in : [ProcessStatus.PROCESSING, ProcessStatus.PENDING] 
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
      console.log("[DEBUG] User is regular, fetching their own process");
      userProcess = await prisma.userProcess.findFirst({
        where: {
          user_id: auth.id,
          status: {
            in : [ProcessStatus.PROCESSING, ProcessStatus.PENDING]    
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });
    }

    console.log("[DEBUG] Fetched userProcess:", userProcess);
    
    if (!userProcess) {
      console.warn("[WARN] No active process found for user");
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
        console.log("[DEBUG] Updated role from DB:", role);
      }
    }
    
    const headers = await preparePythonBackendHeaders(
      userProcess.user_id,
      userProcess.id,
      role
    );
    console.log("[DEBUG] Prepared backend headers:", headers);
    
    const requestData = {
      verification_code: code,
      thread_id: thread_id
    };
    console.log("[DEBUG] Sending data to backend service:", requestData);
    
    try {
      const backendUrl = `${process.env.EXTERNAL_APP_URL}submit-verification-code`
      console.log("[DEBUG] Backend URL:", backendUrl);

      const backendResponse = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      console.log("[DEBUG] Backend response status:", backendResponse.status);

      if (!backendResponse.ok) {
        let errorDetails;
        try {
          errorDetails = await backendResponse.json();
        } catch {
          errorDetails = { error: "Unknown error from backend service" };
        }

        console.error("[ERROR] Backend service returned error:", errorDetails);

        return NextResponse.json(
          { 
            error: "Failed to submit verification code to backend service",
            details: errorDetails
          },
          { status: backendResponse.status }
        );
      }

      const responseData = await backendResponse.json();
      console.log("[DEBUG] Backend response data:", responseData);

      return NextResponse.json({
        success: true,
        message: "Verification code submitted successfully",
        process_id: userProcess.id,
        details: responseData
      });

    } catch (error: any) {
      console.error("[ERROR] Exception while calling backend service:", error);

      return NextResponse.json(
        { 
          error: "Failed to communicate with backend service", 
          message: error.message 
        },
        { status: 503 }
      );
    }
  } catch (error: any) {
    console.error("[ERROR] General exception during verification submission:", error);

    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
