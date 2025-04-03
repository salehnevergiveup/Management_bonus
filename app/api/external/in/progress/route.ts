import { ProcessStatus } from '@/constants/enums';
import { verifyApiKey } from "@/lib/apikeysHandling";
import { NextResponse } from "next/server";
import {prisma} from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    
    const apiKey = request.headers.get('X-API-Key');
    let isAuthenticated = false;
    const externalVerification = await verifyApiKey(request.clone(), "automation");

    if (apiKey) {
      
      if (!externalVerification.valid) {
        return NextResponse.json(
          { error: externalVerification.error },
          { status: 401 }
        );
      }
      isAuthenticated = true;
    } 
    
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

      const body = await request.json();
      const { progress, status } = body;
      const processId = body.processId; 
      
      if (progress === undefined && !status) {
        return NextResponse.json(
          { error: "Missing required fields: progress or status" },
          { status: 400 }
        );
      }

      if (status && !Object.values(ProcessStatus).includes(status)) {
        return NextResponse.json(
          { 
            error: "Invalid status value",
            validValues: Object.values(ProcessStatus)
          },
          { status: 400 }
        );
      }

      try {
        const updateData: any = {};
        
        if (progress !== undefined) {
          updateData.progress = progress;
        }
        
        if (status) {
          updateData.status = status;
          
          if ([ProcessStatus.COMPLETED, ProcessStatus.FAILED].includes(status)) {
          
            updateData.end_time = new Date();
            
    
          }
        }
        
        const updatedProcess = await prisma.userProcess.update({
          where: { id: processId },
          data: updateData
        });

        return NextResponse.json({
          success: true,
          message: "Process updated successfully",
          process: updatedProcess
        });
      } catch (error) {
        console.error("Error updating process:", error);
        return NextResponse.json(
          { error: "Process not found or update failed" },
          { status: 404 }
        );
      }
    
  } catch (error) {
    console.error("Error in process update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}