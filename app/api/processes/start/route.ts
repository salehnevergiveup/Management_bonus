import { NextResponse } from "next/server";
import { ProcessStatus } from "@/constants/enums";
import { SessionValidation } from "@/lib/sessionvalidation";
import { prisma } from '@/lib/prisma';
import { preparePythonBackendHeaders } from '@/lib/apikeysHandling';

let processId = ""; 

export async function POST(request: Request) {
  
  try {
    const auth = await SessionValidation();
    
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: User must be logged in" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const fromDate = body.from_date ? new Date(body.from_date) : null;
    const toDate = body.to_date ? new Date(body.to_date) : null;
    
    console.log("this is from date: ", fromDate);  
    console.log("this is to date: ", toDate);  

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "Both from_date and to_date are required" },
        { status: 400 }
      );
    }
    
    const minDate = new Date("2020-01-01");
    if (fromDate < minDate) {
      return NextResponse.json(
        { error: "From date cannot be before 2020" },
        { status: 400 }
      );
    }
    
    if (toDate < fromDate) {
      return NextResponse.json(
        { error: "To date must be after from date" },
        { status: 400 }
      );
    }
    
    const threeMonthsInMs = 3 * 30 * 24 * 60 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() > threeMonthsInMs) {
      return NextResponse.json(
        { error: "Date range cannot exceed 3 months" },
        { status: 400 }
      );
    }

    const activeProcess = await prisma.userProcess.findFirst({
      where: {
        user_id: auth.id,
        status: {
          in: [ProcessStatus.PENDING, ProcessStatus.PROCESSING]
        }
      }
    });

    if (activeProcess) {
      return NextResponse.json(
        { 
          error: "Active process already exists",
          process_id: activeProcess.id,
          status: activeProcess.status
        },
        { status: 409 } 
      );
    }

    const newProcess = await prisma.$transaction(async (tx) => {
      const newProcess = await tx.userProcess.create({
        data: {
          user_id: auth.id,
          status: ProcessStatus.PENDING,
          progress: 0,
        }
      });
      return newProcess;
    });

    processId = newProcess.id; 
    console.log(processId)
    console.log("date starting: ",  fromDate.toISOString());  
    console.log("date ending: ",  toDate.toISOString());
    try {
      // I MESS UNDERSTAND THE REQUIREMENT AT THE START I WILL LATER CREATE MODULE FOR THIS ACCOUNTS FOR TESTING 
      // I MAKE IT MANUAL FOR NOW 
      const requestData = {
        from_date: fromDate.toISOString(),
        to_date: toDate.toISOString(),
        accounts: [
          {
            username: "wglobal5sub1",//later fetch from the backend 
            password: "abc123"
          },
          {
            username: "wglobal6sub1",//later fetch from the backend 
            password: "abc123"
          }
        ]
      };
      
      const headers = await preparePythonBackendHeaders(
        auth.id, 
        processId,  
        auth.role
      );

      console.log("Calling external service with prepared headers");
      const externalResponse = await fetch(`http://127.0.0.1:8000/start-process`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestData)
      });

      if (!externalResponse.ok) {
        console.error("External service returned error:", externalResponse.status);
        
        await cleanupProcess(processId);
        
        let errorDetails;
        try {
          errorDetails = await externalResponse.json();
        } catch {
          errorDetails = { error: "Unknown error from external service" };
        }
        
        return NextResponse.json(
          { 
            error: "Failed to start process with external service",
            details: errorDetails,
            process_id: processId
          },
          { status: 502 }
        );
      }

      const responseData = await externalResponse.json();
      console.log("External service response:", responseData);
      
      await prisma.userProcess.update({
        where: { id: processId },
        data: { status: ProcessStatus.PROCESSING }
      });
      
      return NextResponse.json({
        success: true,
        message: "Process created and initiated successfully",
        process_id: processId,
        status: ProcessStatus.PROCESSING,
        details: responseData
      });
    } catch (error) {
      console.error("Error calling external service:", error);
      
      await cleanupProcess(processId);
      
      return NextResponse.json(
        { 
          error: "Failed to connect to external service",
          details: error,
          process_id: processId 
        },
        { status: 500 } 
      );
    }
  } catch (error) {
    console.error("Error creating process:", error);
    
    if (processId) {
      await cleanupProcess(processId);
    }
    
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}

async function cleanupProcess(processId: string) {
  try {
    console.log(`Cleaning up process ${processId} due to failure`);
    
    const deletedProcess = await prisma.userProcess.delete({
      where: {
        id: processId
      }
    });
    
    console.log(`Cleaned up process ${processId}`);
    return true;
  } catch (cleanupError) {
    console.error(`Failed to clean up process ${processId}:`, cleanupError);
    return false;
  }
}