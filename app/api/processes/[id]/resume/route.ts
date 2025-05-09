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
        {message: "unauthenticated request"},
        {status: 401}
      )
    }
    
    const {id:processId} = await params;
    const body = await request.json();
    
    if(!processId) {
      return NextResponse.json(
        {error: "Invalid process id"},
        {status: 402}
      )
    }
    
    if(!body) {
      return NextResponse.json(
        {error: "Empty request body"},
        {status: 400}
      )
    }
    
    if(!body.matches) {
      return NextResponse.json(
        {error: "Matches not found"},
        {status: 400}
      )
    }
    
    sendDataToResume(auth.id, auth.role, processId, body.matches);
    
    //make sure to immediately to update the process status
    await prisma.userProcess.update({
      where: {id: processId},
      data: {
        status: ProcessStatus.PROCESSING //change it later
      }
    });
    
    return NextResponse.json(
      {
        success: true,
        message: "Process B started",
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
    console.log(data);
    
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
      await prisma.userProcess.update({
        where: { id: processId },
        data: { status: ProcessStatus.PENDING }
      });
      
      try {
        const error = await externalResponse.json();
        await notificationFunction(authId, error, NotificationType.ERROR);
      } catch {
        await notificationFunction(authId, "Unknown error from external service", NotificationType.ERROR);
      }
      return;
    }
    
    await notificationFunction(authId, "Process data send successfully to automation app", NotificationType.SUCCESS);
  } catch(error) {
    await prisma.userProcess.update({
      where: { id: processId },
      data: { status: ProcessStatus.PENDING }
    });
    
    await notificationFunction(authId, "Unknown error from external service", NotificationType.ERROR);
  }
}