import {ProcessCommand} from "@/lib/processCommand"
import { SessionValidation } from "@lib/sessionvalidation";
import { NextResponse } from "next/server";
import {preparePythonBackendHeaders } from "@lib/apikeysHandling"
import { NotificationType, ProcessStatus } from "@constants/enums";
import { prisma } from '@/lib/prisma';

// Simple in-memory rate limiter
const rateLimiter = {
  lastRequestTime: 0,
  minInterval: 10000, // 10 seconds in milliseconds
  
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
    console.log("resume process route");
    // Check rate limit before processing the request
    if (!rateLimiter.canMakeRequest()) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          message: "Please wait 10 seconds before making another request"
        },
        { status: 429 }  // 429 Too Many Requests
      );
    }
    
    // Record this request
    rateLimiter.recordRequest();
    
    const auth = await SessionValidation();
    if(!auth) {
      return NextResponse.json(
        {message: "Unauthenticated request"},
        {status: 401}
      )
    }
    
    const {id:processId} = await params;
    const body = await request.json();
    
    if(!processId) {
      return NextResponse.json(
        {error: "Invalid process ID"},
        {status: 402}
      )
    }
    
    if(!body) {
      return NextResponse.json(
        {error: "Request body is empty"},
        {status: 400}
      )
    }
    
    if(!body.matches) {
      return NextResponse.json(
        {error: "No matches found in request"},
        {status: 400}
      )
    }
    
    sendDataToResume(auth.id, auth.role, processId, body.matches);
    
   
    return NextResponse.json(
      {
        success: true,
        message: "Request has been sent to start the process",
      },
      {
      }
    );
  } catch(error) {
    console.error("Error creating process:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function sendDataToResume(authId: string, authRole: string, processId: string, matches: any[]) {
  //async function for the notification
  const notificationFunction = ProcessCommand["notify all"];
  
  try {
    const data = await ProcessCommand["resume"](authId, processId, matches);
    
    const headers = await preparePythonBackendHeaders(
      authId,
      processId,
      authRole
    );
    
    const externalResponse = await fetch(`${process.env.EXTERNAL_APP_URL}resume-process`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(data)
    })
    
    if(!externalResponse.ok) {
      
      const error = await externalResponse.json();  

      if(externalResponse.status === 409) { 
        await notificationFunction(authId, "Request is already being processed. Please wait.", NotificationType.ERROR);  
        return;  
      }

      try {
        await notificationFunction(authId, error.message || error.detail || "External service error", NotificationType.ERROR);
      } catch {
        await notificationFunction(authId, "An unknown error occurred with the external service", NotificationType.ERROR);
      }

      return;
    }
    
    await notificationFunction(authId, "Process data sent successfully to automation app", NotificationType.SUCCESS);

    await prisma.userProcess.update({
      where: {id: processId},
      data: {
        status: ProcessStatus.PROCESSING
      }
    });

  } catch(error) {
    await prisma.userProcess.update({
      where: { id: processId },
      data: { status: ProcessStatus.PENDING }
    });
    
    await notificationFunction(authId, "An unknown error occurred with the external service", NotificationType.ERROR);
  }
}