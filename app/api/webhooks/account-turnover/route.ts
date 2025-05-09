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
    
    // Fire-and-forget async task
    (async () => {
      try {
        const agentAccountPromises = [];
        const accountTurnoverPromises = [];
        
        const processStatusPromise = prisma.userProcess.update({
          where: { id: processId },
          data: { status: ProcessStatus.PENDING }
        });
        
        const firstAgentAccountKey = Object.keys(body)[0];
        const firstAgentAccountData = body[firstAgentAccountKey];
        
        for (const agentKey of Object.keys(body)) {
          const agentData = body[agentKey];
          
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
          
          // Add defensive checks
          if (agentData.accounts && agentData.accounts.data) {
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
        
        await Promise.all(agentAccountPromises);
        
        const exchangeRatePromises = [];
        
        if (firstAgentAccountData && firstAgentAccountData.exchange_rate && firstAgentAccountData.exchange_rate.data) {
          for (const fromCurrency in firstAgentAccountData.exchange_rate.data) {
            const exchangeRateObj = firstAgentAccountData.exchange_rate.data[fromCurrency];
            
            for (const toCurrency in exchangeRateObj) {

              const rateString = exchangeRateObj[toCurrency];
              const rateValue = parseFloat(rateString.split(':')[1].trim());
              
              const existingRate = await prisma.exchangeRate.findFirst({
                where: {
                  fromCurrency,
                  toCurrency
                }
              });
              
              if (existingRate) {
                console.log(`💱 Updating Exchange Rate | ${fromCurrency} ➡ ${toCurrency}: ${rateValue}`);
                exchangeRatePromises.push(
                  prisma.exchangeRate.update({
                    where: { id: existingRate.id },
                    data: { rate: rateValue }
                  })
                );
              } else {
                console.log(`💱 Creating Exchange Rate | ${fromCurrency} ➡ ${toCurrency}: ${rateValue}`);
                exchangeRatePromises.push(
                  prisma.exchangeRate.create({
                    data: {
                      fromCurrency,
                      toCurrency,
                      rate: rateValue
                    }
                  })
                );
              }
            }
          }
        }

        await Promise.all([
          processStatusPromise,
          ...exchangeRatePromises,
          ...accountTurnoverPromises
        ]);
        
        console.log('Account turnover and exchange rate processing completed successfully');
      } catch (error) {
        console.error('Error in background processing:', error);
      }
    })();
    
    return NextResponse.json({
      success: true,
      message: "Processing started"
    }, { status: 202 });
  } catch (err) {
    console.error("Error in request handler:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
