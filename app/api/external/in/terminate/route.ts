import { ProcessCommand } from "@/lib/processCommand";
import { verifyApi } from "@/lib/apikeysHandling";
import { NextResponse } from "next/server";
import { ProcessStatus } from "@/constants/enums";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // Authenticate the external request
    const apiKey = request.headers.get('X-API-Key');
    const userId = request.headers.get('X-User-ID');
    const processId = request.headers.get('X-Process-ID');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "Unauthorized: API key required" },
        { status: 401 }
      );
    }
    
    if (!userId || !processId) {
      return NextResponse.json(
        { error: "Bad Request: Missing required headers" },
        { status: 400 }
      );
    }
    
    // Verify the external request
    const externalVerification = await verifyApi(request.clone(), "automation");
    
    if (!externalVerification.valid) {
      return NextResponse.json(
        { error: externalVerification.error },
        { status: 401 }
      );
    }
    
    // Verify that the process exists and belongs to the user
    const userProcess = await prisma.userProcess.findFirst({
      where: {
        id: processId,
        user_id: userId
      }
    });
    
    if (!userProcess) {
      return NextResponse.json(
        { error: "Not Found: Process not found or does not belong to user" },
        { status: 404 }
      );
    }
    
    // Update process status to FAILED
    await prisma.userProcess.update({
      where: { id: processId },
      data: { 
        status: ProcessStatus.FAILED,
        end_time: new Date()
      }
    });
    
    // Execute the terminate command
    const result = await ProcessCommand["terminate"](userId, processId);
    
    return NextResponse.json({
      success: true,
      message: "Process terminated successfully",
      process_id: processId,
      status: ProcessStatus.FAILED,
      details: result
    });
    
  } catch (error) {
    console.error("Error processing termination request:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}