import { ProcessCommand } from "@/lib/processCommand";
import { verifyExternalRequest } from "@/lib/verifyexternalrequest";
import { NextResponse } from "next/server";
import { ProcessStatus } from "@constants/enums";
import {IncomingUser} from "@/types/collected-users"
import {prisma} from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    
    const apiKey = request.headers.get('X-API-Key');
    let authId: string| undefined;
    let processId: string| undefined;
    
    if (apiKey) {
      
      const externalVerification = await verifyExternalRequest(request.clone());
      
      if (!externalVerification.valid) {
        return NextResponse.json(
          { error: externalVerification.error },
          { status: 401 }
        );
      }

      authId = externalVerification.userId;
      processId = externalVerification.processId;

    } else {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    if (!body.users || !Array.isArray(body.users) || body.users.length === 0) {
      return NextResponse.json(
        { error: "Invalid input: 'users' must be a non-empty array" },
        { status: 400 }
      );
    }

    if(!authId || !processId) {  
        return NextResponse.json(
            { error: "Invalid request" },
            { status: 400 }
          );
    }
    
    // Update process status to PROCESSING
    await prisma.userProcess.update({
      where: { id: processId },
      data: { status: ProcessStatus.PENDING }
    });
    
    processUsers(authId, processId, body.users)
      .then(result => {
        if (!result.success) {
          console.error(`Background processing failed for process ${processId}:`, result);
          prisma.userProcess.update({
            where: { id: processId },
            data: { status: ProcessStatus.FAILED }
          }).catch(e => console.error("Failed to update process status:", e));
        } else {
          console.log(`Successfully processed ${result.processedCount} users for process ${processId}`);
        }
      })
      .catch(error => {
        console.error(`Error in background processing for process ${processId}:`, error);
        
        prisma.userProcess.update({
          where: { id: processId },
          data: { status: ProcessStatus.FAILED }
        }).catch(e => console.error("Failed to update process status:", e));
      });
    
    // Return immediate response
    return NextResponse.json({
      success: true,
      message: "User processing initiated",
      processId: processId,
      status: ProcessStatus.PENDING,
      userCount: body.users.length
    }, { status: 202 }); 
    
  } catch (error) {
    console.error("Error initiating user processing:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

  
// Process handler function to orchestrate filtering and matching
const processUsers = async (authId: string, processId: string, users: IncomingUser[]) => {
try {
    
    //filter
    const filteredUsers = await ProcessCommand["filter"](users);
    
    if (filteredUsers.length === 0) {
    console.warn("No users remained after filtering");
    return { success: false, message: "No valid users to process" };
    }
    
    //match
    const matchResult = await ProcessCommand["match"](authId, filteredUsers, processId);
    
    return { 
    success: true, 
    matchResult,
    processedCount: filteredUsers.length
    };
} catch (error) {
    console.error("Error in user processing pipeline:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
}
};