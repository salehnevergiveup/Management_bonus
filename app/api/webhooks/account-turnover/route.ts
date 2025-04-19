import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import {  AgentAccountStatus, ProcessStatus } from '@constants/enums';
import { verifyApi } from '@lib/apikeysHandling';

export async function POST(request: Request) {
    try {
      // Verify API headers and extract auth info
      const verification = await verifyApi(request.clone(), "automation");
      if (!verification.valid) {
        return NextResponse.json(
          { error: verification.error },
          { status: verification.status || 401 }
        );
      }
  
      const userId = verification.userId;
      const processId = verification.processId;
  
      const body = await request.json();
      console.log("📥 Incoming payload:", JSON.stringify(body, null, 2));
  
    // Fire-and-forget async task
    (async () => {
      try {
        const agentAccountPromises = [];
        const accountTurnoverPromises = [];

        const processStatusPromise = prisma.userProcess.update({
          where: { id: processId },
          data: { status: ProcessStatus.PENDING }
        });

        for (const agentKey of Object.keys(body)) {
          const agentData = body[agentKey];
          
          // Update agent account status
          agentAccountPromises.push(
            prisma.agentAccount.updateMany({
              where: { username: agentData.agent_account },
              data: {
                progress: agentData.progress,
                status: AgentAccountStatus.NO_PROCESS,
                updated_at: new Date()
              }
            })
          );
          
          if (!processId) {
            throw new Error("Missing process ID");
          }
          
          console.log("Processing agent:", agentKey);
          console.log("Agent data structure:", JSON.stringify({
            hasAccounts: !!agentData.accounts,
            accountsType: agentData.accounts ? typeof agentData.accounts : 'undefined',
            hasData: agentData.accounts ? !!agentData.accounts.data : false
          }));
          
          // Add defensive checks
          if (agentData.accounts && agentData.accounts.data) {
            // Handle turnover data
            for (const username in agentData.accounts.data) {
              const turnovers = agentData.accounts.data[username];
              if (Array.isArray(turnovers)) {
                for (const item of turnovers) {
                  if (item && typeof item.turnover === 'string') {
                    const turnover = parseFloat(item.turnover.replace(/,/g, ''));
                    accountTurnoverPromises.push(
                      prisma.accountTurnover.create({
                        data: {
                          username,
                          game: item.game,
                          currency: item.currency,
                          turnover,
                          process_id: processId
                        }
                      })
                    );
                  }
                }
              }
            }
          } else {
            console.log(`Warning: Agent ${agentKey} missing accounts.data structure`);
          }
        }

        // Wait for all updates to complete
        await Promise.all([processStatusPromise,...agentAccountPromises, ...accountTurnoverPromises]);
        console.log('Account turnover processing completed successfully');
      } catch (error) {
        console.error('❌ Error in background processing:', error);
      }
    })();
  
      return NextResponse.json({
        success: true,
        message: "Processing started"
      }, { status: 202 });
  
    } catch (err) {
      console.error("❌ Error in request handler:", err);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  }