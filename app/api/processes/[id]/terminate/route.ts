import {ProcessCommand} from "@/lib/processCommand"
import { SessionValidation } from "@lib/sessionvalidation";
import { NextResponse } from "next/server";
import {preparePythonBackendHeaders } from "@lib/apikeysHandling"
import { NotificationType, ProcessStatus } from "@constants/enums";

const rateLimiter = {
  lastRequestTime: 0,
  minInterval: 10000,
  canMakeRequest(): boolean {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    return timeSinceLastRequest >= this.minInterval;
  },
  recordRequest(): void {
    this.lastRequestTime = Date.now();
  }
};

export async function POST(request: Request, {params} : { params: Promise<{ id: string }> }){
  try {
    if (!rateLimiter.canMakeRequest()) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Please wait 10 seconds before making another request"
        },
        { status: 429 }
      );
    }
    
    // Record this request
    rateLimiter.recordRequest();
    
    const auth = await SessionValidation();
    if(!auth) {
      return NextResponse.json(
        {message: "unauthenticated request"},
        {status: 401}
      )
    }
    
    const {id:processId} = await params;
    
    if(!processId) {
      return NextResponse.json(
        {error: "Invalid process id"},
        {status: 400}
      )
    }
    
    const terminateResult = await sendDataToTerminate(auth.id, auth.role, processId);
    
    if (terminateResult && terminateResult.success) {
   
      return NextResponse.json(
        {
          success: true,
          message: terminateResult.message || "Process terminated successfully",
          processId: processId,
          terminatedCount: terminateResult.terminated_count || 0
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          message: terminateResult?.message || "Failed to terminate process",
          processId: processId
        },
        { status: 400 }
      );
    }
    
  } catch(error) {
    console.error("Error terminating process:", error);
    
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function sendDataToTerminate(authId: string, authRole: string, processId: string) {
  console.log("testing")
  const notificationFunction = ProcessCommand["notify all"];
  
  try {
    const headers = await preparePythonBackendHeaders(
      authId,
      processId,
      authRole
    );
    
    const externalResponse = await fetch(`${process.env.EXTERNAL_APP_URL}terminate`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({})  
    });
    
    if(!externalResponse.ok) {
      const error = await externalResponse.json().catch(() => ({ message: 'Unknown error' }));
      
      await notificationFunction(
        authId, 
        `Failed to terminate process: ${error.message || error.detail || 'Unknown error'}`, 
        NotificationType.ERROR
      );
      
      return {
        success: false,
        message: error.message || error.detail || 'Failed to terminate process'
      };
    }
    
    const res = await externalResponse.json();
    
    
    await notificationFunction(
      authId, 
      `Process terminated successfully. ${res.terminated_count ? `Terminated ${res.terminated_count} tasks.` : ''}`, 
      NotificationType.SUCCESS
    );
    
    return {
      success: true,
      ...res
    };
    
  } catch(error) {
    console.error('Error calling terminate endpoint:', error);
    
    await notificationFunction(
      authId, 
      `Error terminating process: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      NotificationType.ERROR
    );
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}