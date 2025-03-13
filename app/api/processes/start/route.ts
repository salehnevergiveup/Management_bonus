import { NextResponse } from "next/server";
import { ProcessStatus } from "@/constants/enums";
import { SessionValidation } from "@/lib/sessionvalidation";
import { GenerateToken, Signature } from "@/lib/verifyexternalrequest";
import { prisma } from '@/lib/prisma';

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

    const processId = crypto.randomUUID();
    
    const { token, timeStamp } = await GenerateToken(auth.id, processId);
    
    const newProcess = await prisma.$transaction(async (tx) => {
      const newProcess = await tx.userProcess.create({
        data: {
          id: processId,
          user_id: auth.id,
          status: ProcessStatus.PENDING,
          progress: 0,
        }
      });
      
      await tx.processToken.create({
        data: {
          token,
          process_id: newProcess.id,
          user_id: auth.id,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isComplete: false
        }
      });
      
      return newProcess;
    });

    const requestData = {
      process_id: processId,
      user_id: auth.id,
      from_date: fromDate.toISOString(),
      to_date: toDate.toISOString()
    };
    
    const signature = Signature(requestData, token, timeStamp);

    try {
      const externalResponse = await fetch(`http://127.0.0.1:8000/api/testing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.API_KEY || '',
          'X-Token': token,
          'X-Timestamp': timeStamp,
          'X-Signature': signature
        },
        body: JSON.stringify(requestData)
      });

      if (!externalResponse.ok) {
        await prisma.userProcess.update({
          where: { id: processId },
          data: { 
            status: ProcessStatus.FAILED,
            end_time: new Date()
          }
        });
        
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
      console.error("Error communicating with external service:", error);
      
      await prisma.userProcess.update({
        where: { id: processId },
        data: { 
          status: ProcessStatus.FAILED,
          end_time: new Date()
        }
      });
      
      return NextResponse.json(
        { 
          error: "Failed to connect to external service",
          process_id: processId 
        },
        { status: 503 } 
      );
    }
  } catch (error) {
    console.error("Error creating process:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}