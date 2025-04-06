import { NextResponse } from "next/server";
import { AgentAccountStatus, ProcessStatus } from "@/constants/enums";
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
    const agentAccounts = body.agent_accounts || [];
    
    console.log("From date:", fromDate);  
    console.log("To date:", toDate);  
    console.log("Agent accounts:", agentAccounts);

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
        id: true, // Added ID for later update
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

    processId = newProcess.id; 
    console.log("Process ID:", processId);
    console.log("Date range:", fromDate.toISOString(), "to", toDate.toISOString());
    
    try {
      // Prepare request data with actual account credentials
      const requestData = {
        from_date: fromDate.toISOString(),
        to_date: toDate.toISOString(),
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
      
      console.log("Request data prepared:", JSON.stringify(requestData));
      console.log("Calling external service with prepared headers");
      
      // making request to selenium to start the process  
      const externalResponse = await fetch(`${process.env.EXTERNAL_APP_URL}/start-process`, {
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
      
      // Update process status to PROCESSING
      await prisma.userProcess.update({
        where: { id: processId },
        data: { status: ProcessStatus.PROCESSING }
      });
      
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
      
      return NextResponse.json({
        success: true,
        message: "Process created and initiated successfully",
        process_id: processId,
        status: ProcessStatus.PROCESSING,
        agent_accounts: accounts.length
        // details: responseData
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
    
    await prisma.agentAccount.updateMany({
      where: {
        process_id: processId
      },
      data: {
        process_id: null,
        status: AgentAccountStatus.NO_PROCESS,// Reset to default status
        progress: null,  
        updated_at: new Date()
      }
    });
    
    // Then delete the process
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