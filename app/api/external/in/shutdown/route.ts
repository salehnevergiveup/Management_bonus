import { ProcessCommand } from "@/lib/processCommand";
import { verifyExternalRequest } from "@/lib/verifyexternalrequest";
import { NextResponse } from "next/server";
import { ProcessStatus } from "@constants/enums";
import {prisma} from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // Authenticate the external request
    const apiKey = request.headers.get('X-API-Key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "Unauthorized: API key required" },
        { status: 401 }
      );
    }
    
    // Verify the external request
    const externalVerification = await verifyExternalRequest(request.clone());
    
    if (!externalVerification.valid) {
      return NextResponse.json(
        { error: externalVerification.error },
        { status: 401 }
      );
    }
    
    // Extract authenticated user ID and process ID from verification
    const authId = externalVerification.userId;
    const processId = externalVerification.processId;
    
    if(!authId || !processId) {  
      return NextResponse.json(
          { error: "Invalid request" },
          { status: 400 }
        );
    }

    try {
      await prisma.processToken.update({
        where: { token: externalVerification.token },
        data: { isComplete: true }
      });
    } catch (tokenError) {
      console.error("Error completing token:", tokenError);
    }
    
    await prisma.userProcess.update({
      where: { id: processId },
      data: { status: ProcessStatus.FAILED }
    });
    
    // Execute the terminate command
    const result = await ProcessCommand["terminate"](authId, processId);
    
    return NextResponse.json({
      success: true,
      message: "Process terminated successfully",
      processId,
      deletedMatches: result
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