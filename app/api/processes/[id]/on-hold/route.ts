import {ProcessCommand} from "@/lib/processCommand"
import { SessionValidation } from "@lib/sessionvalidation";
import { NextResponse } from "next/server";
import { NotificationType, ProcessStatus } from "@constants/enums";
import { prisma } from '@/lib/prisma';
import { preparePythonBackendHeaders } from "@lib/apikeysHandling";

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
export async function PUT(request: Request, {params} : { params: Promise<{ id: string }> }){
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
          {status: 402}
        )
      }
      
      const data = await sendDataToCheckStatus(auth.id, auth.role, processId);
      
      // Only update status if process is NOT running
      if(data.success && !data.is_running) {
        await prisma.userProcess.update({
          where: {id: processId},
          data: {
            status: ProcessStatus.ONBHOLD
          }
        });
        
        return NextResponse.json(
          {
            success: true,
            message: "Process status changed to ON HOLD",
            is_running: data.is_running
          },
          {
            status: 200
          }
        );
      } else if(data.success && data.is_running) {
        return NextResponse.json(
          {
            success: false,
            message: "Cannot change status - process is currently running",
            is_running: data.is_running
          },
          {
            status: 400
          }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            message: data.message || "Failed to check process status"
          },
          {
            status: 500
          }
        );
      }
    } catch(error) {
      console.error("Error in process status endpoint:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
  
  async function sendDataToCheckStatus(authId: string, authRole: string, processId: string) {
    const notificationFunction = ProcessCommand["notify all"];
    
    try {
      const headers = await preparePythonBackendHeaders(
        authId,
        processId,
        authRole
      );
      
      const externalResponse = await fetch(`${process.env.EXTERNAL_APP_URL}check-process-status`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({})
      });
      
      if(!externalResponse.ok) {
        const error = await externalResponse.json().catch(() => ({ message: 'Unknown error' }));
        await notificationFunction(
          authId,
          `Failed to check process status: ${error.message || error.detail || 'Unknown error'}`,
          NotificationType.ERROR
        );
        return {
          success: false,
          message: error.message || error.detail || 'Failed to check process status'
        };
      }
      
      const res = await externalResponse.json();
      
      if(!res.is_running) {
        await notificationFunction(
          authId,
          'Process status has successfully been changed to ON HOLD',
          NotificationType.SUCCESS
        );
      } else {
        await notificationFunction(
          authId,
          'Unable to change the process status. The automation system is currently running. You have to terminate the process first.',
          NotificationType.WARNING
        );
      }
      
      return {
        success: true,
        is_running: res.is_running,
        ...res
      };
    } catch(error) {
      console.error('Error calling check status endpoint:', error);
      await notificationFunction(
        authId,
        `Error checking process status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        NotificationType.ERROR
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }