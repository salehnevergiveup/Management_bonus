import { SessionValidation } from "@lib/sessionvalidation";
import { NextResponse } from "next/server";
import { ProcessStatus } from "@constants/enums";
import { prisma } from '@/lib/prisma';

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
   
    
    if(!processId) {
      return NextResponse.json(
        {error: "Invalid process id"},
        {status: 402}
      )
    }
    
    await prisma.userProcess.update({
      where: {id: processId},
      data: {
        status: ProcessStatus.SUCCESS 
      }
    });
    
    return NextResponse.json(
      {
        success: true,
        message: "Process B started",
      },
      {status:  201}
    );
  } catch(error) {
    console.error("Error creating process:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}