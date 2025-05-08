import { NextResponse } from "next/server";
import { AgentAccountStatus, NotificationType, ProcessStatus } from "@/constants/enums";
import { SessionValidation } from "@/lib/sessionvalidation";
import { prisma } from '@/lib/prisma';
import { preparePythonBackendHeaders } from '@/lib/apikeysHandling';
import ProcessCommand from "@lib/processCommand";

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

export async function POST(request: Request) {
  let processId = ""; 
  
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
    
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: User must be logged in" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const fromDate = body.from_date ? new Date(body.from_date) : null;
    const toDate = body.to_date ? new Date(body.to_date) : null;
    const agentAccounts = body.agent_accounts || [];
    
    // Validate dates
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

    // Validate agent accounts
    if (!Array.isArray(agentAccounts) || agentAccounts.length === 0) {
      return NextResponse.json(
        { error: "At least one agent account is required" },
        { status: 400 }
      );
    }

    // Get agent accounts for the specified agent usernames
    const accounts = await prisma.agentAccount.findMany({
      where: {
        username: {
          in: agentAccounts
        }
      },
      select: {
        id: true,
        username: true,
        password: true
      }
    });
    
    console.log("Found agent accounts:", accounts.length); 
    
    // Check if all requested agent accounts exist
    const foundUsernames = accounts.map(account => account.username);
    const missingAccounts = agentAccounts.filter(username => !foundUsernames.includes(username));
    
    if (missingAccounts.length > 0) {
      return NextResponse.json(
        { 
          error: "Some agent accounts were not found", 
          missing_accounts: missingAccounts 
        },
        { status: 404 }
      );
    }

    // Check for active process
    const activeProcess = await prisma.userProcess.findMany({
      where: {
        status: {
          in: [ProcessStatus.PENDING, ProcessStatus.PROCESSING]
        }
      }
    });

    if (activeProcess) {
      return NextResponse.json(
        { 
          error: "Active process already exists",
        },
        { status: 409 } 
      );
    }

    // Create new process
    const newProcess = await prisma.$transaction(async (tx) => {
      const newProcess = await tx.userProcess.create({
        data: {
          user_id: auth.id,
          from_date: fromDate.toISOString(),
          to_date: toDate.toISOString(),
          status: ProcessStatus.PENDING
        }
      });
      return newProcess;
    });
    
    // Assign the process ID
    processId = newProcess.id;
    
    // Update agent accounts to link them to the process
    const accountIds = accounts.map(acc => acc.id);
    
    await prisma.agentAccount.updateMany({
      where: {
        id: {
          in: accountIds
        }
      },
      data: {
        process_id: processId,
        status: AgentAccountStatus.UNDER_PROCESS,  
        progress: 0,
        updated_at: new Date()
      }
    });
    
    console.log(`Updated ${accountIds.length} agent accounts with process ID ${processId}`);
    
    // Fire and forget: Start the process in the background
    startProcess(auth, fromDate, toDate, accounts, processId).catch(error => {
      console.error(`Background process ${processId} failed:`, error);
      // Attempt cleanup in the background if the process fails
      cleanupProcess(processId).catch(cleanupError => {
      console.error(`Failed to clean up process ${processId} after error:`, cleanupError);
      });
    });

    return NextResponse.json({
      success: true,
      message: "Process will start soon",
      process_id: processId,
      status: ProcessStatus.PENDING 
    });
    
  } catch (error) {
    console.error("Error creating process:", error);
    
    // Only attempt cleanup if we have a process ID
    if (processId) {
      await cleanupProcess(processId);
    }
    
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}

async function startProcess(auth: any, fromDate: Date, toDate: Date, accounts: any[], processId: string) { 
  try {
    const pad = (n: any) => (n < 10 ? '0' + n : n);

    // Set fixed time explicitly for both dates
    const formatDateTime = (date: any, endOfDay = false) => {
      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1); // JS months are 0-based
      const day = pad(date.getDate());
      const time = endOfDay ? "23:59:59" : "00:00:00";
      return `${year}-${month}-${day} ${time}`;
    };
    
    const requestData = {
      from_date: formatDateTime(fromDate),
      to_date: formatDateTime(toDate, true), // end of day for the last date
      accounts: accounts.map(acc => ({
        username: acc.username,
        password: acc.password
      }))
    };
    
    const headers = await preparePythonBackendHeaders(
      auth.id, 
      processId,  
      auth.role
    );
    
    console.log(`[Process ${processId}] Request data prepared`);
    console.log(`[Process ${processId}] Calling external service with prepared headers`);
    
    // making request to selenium to start the process  
    console.log(`${process.env.EXTERNAL_APP_URL}start-process`);
    const externalResponse = await fetch(`${process.env.EXTERNAL_APP_URL}start-process`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestData)
    });

    if (!externalResponse.ok) {
      console.error(`[Process ${processId}] External service returned error:`, externalResponse.status);
      
      await cleanupProcess(processId);
      
      let errorDetails;
      try {
        errorDetails = await externalResponse.json();
      } catch {
        errorDetails = { error: "Unknown error from external service" };
      }
      
      throw new Error(`Failed to start process with external service: ${JSON.stringify(errorDetails)}`);
    }

    const responseData = await externalResponse.json();
    console.log(`[Process ${processId}] External service response:`, responseData);
    
    // Update process status to PROCESSING
    await prisma.userProcess.update({
      where: { id: processId },
      data: { status: ProcessStatus.PROCESSING }
    });
    
    console.log(`[Process ${processId}] Updated process status to PROCESSING`);
    
    await ProcessCommand["notify all"](auth.id,'Process start successfully!' , NotificationType.ERROR);
    return true;
  } catch (error) {

    //Notify users about the failure
    await ProcessCommand["notify all"](auth.id,'Failed to start process with external service' , NotificationType.ERROR);
    console.error(`[Process ${processId}] Error in background process:`, error);
    
    try {
      await cleanupProcess(processId);
      console.log(`[Process ${processId}] Cleanup completed after background process error`);
    } catch (cleanupError) {
      console.error(`[Process ${processId}] Failed to clean up after background process error:`, cleanupError);
    }
    
    throw error; // Re-throw to be caught by the calling catch handler
  }
}

async function cleanupProcess(processId: string) {
  console.log(`Starting cleanup for process ${processId}`);
  let successFlag = true;
  
  // Step 1: Update agent accounts to remove process - retry up to 3 times
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Updating agent accounts for process ${processId}`);
      
      // First update the agent accounts to remove process
      await prisma.agentAccount.updateMany({
        where: {
          process_id: processId
        },
        data: {
          process_id: null,
          status: AgentAccountStatus.NO_PROCESS,
          progress: null,  
          updated_at: new Date()
        }
      });
      
      console.log(`Successfully updated agent accounts for process ${processId}`);
      break; 
    } catch (error) {
      console.error(`Attempt ${attempt} failed to update agent accounts:`, error);
      
      if (attempt === 3) {
        // Last attempt failed, but we'll continue with deletion anyway
        console.error(`All attempts to update agent accounts failed for process ${processId}`);
        successFlag = false;
      } else {
       
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  // Step 2: Delete the process - retry up to 3 times
  // Even if updating accounts failed, we still try to delete the process
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Deleting process ${processId}`);
      
      await prisma.userProcess.delete({
        where: {
          id: processId
        }
      });
      
      console.log(`Successfully deleted process ${processId}`);
      break; // Success, exit retry loop
    } catch (error) {
      console.error(`Attempt ${attempt} failed to delete process:`, error);
      
      if (attempt === 3) {
        // Last attempt failed
        console.error(`All attempts to delete process ${processId} failed`);
        successFlag = false;
      } else {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  // Step 3: If process deletion failed, try to update its status instead
  if (!successFlag) {
    try {
      console.log(`Attempting to mark process ${processId} as failed since deletion failed`);
      
      await prisma.userProcess.update({
        where: {
          id: processId
        },
        data: {
          status: ProcessStatus.FAILED,
          updated_at: new Date()
        }
      });
      
      console.log(`Marked process ${processId} as failed`);
    } catch (finalError) {
      console.error(`Failed to even mark process as failed:`, finalError);
    }
    
    // Final verification - double check agent accounts
    try {
      console.log(`Final verification: Checking if any agent accounts still reference process ${processId}`);
      
      const remainingAccounts = await prisma.agentAccount.findMany({
        where: {
          process_id: processId
        },
        select: {
          id: true,
          username: true
        }
      });
      
      if (remainingAccounts.length > 0) {
        console.log(`Found ${remainingAccounts.length} accounts still referencing the process, forcing cleanup`);
        
        // Force cleanup one last time
        await prisma.agentAccount.updateMany({
          where: {
            process_id: processId
          },
          data: {
            process_id: null,
            status: AgentAccountStatus.NO_PROCESS,
            progress: null,
            updated_at: new Date()
          }
        });
      }
    } catch (finalCheckError) {
      console.error(`Final verification check failed:`, finalCheckError);
    }
  }
  
  console.log(`Cleanup process for ${processId} completed with${successFlag ? '' : ' partial'} success`);
  return successFlag;
}