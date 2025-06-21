import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import {  AgentAccountStatus, ProcessStatus } from '@constants/enums';
import { verifyApi } from '@lib/apikeysHandling';


export async function POST(request: Request) {
  try {
    const verification = await verifyApi(request.clone(), "automation");
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error },
        { status: verification.status || 401 }
      );
    }
    
    const userId = verification.userId;
    const processId = verification.processId ?? "";
    const body = await request.json();
    
    insertTurnoverData(processId, body); 
    
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

async function insertTurnoverData(processId: string, body: any) {  
  try {
    await prisma.$transaction(async (tx) => {
      const agentAccountPromises = [];
      const accountTurnoverData = []; 
      
      const firstAgentAccountKey = Object.keys(body)[0];
      const firstAgentAccountData = body[firstAgentAccountKey];
      
      for (const agentKey of Object.keys(body)) {
        const agentData = body[agentKey];
        
        agentAccountPromises.push(
          tx.agentAccount.updateMany({
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
        console.log("this is the process id " + processId);
        if (agentData.accounts && agentData.accounts.data) {
          for (const username in agentData.accounts.data) {
            const turnovers = agentData.accounts.data[username];

            if (Array.isArray(turnovers)) {
              for (const item of turnovers) {
                if (item && typeof item.turnover === 'string') {
                  const turnover = parseFloat(item.turnover.replace(/,/g, ''));
                  accountTurnoverData.push({
                    username,
                    game: item.game,
                    currency: item.currency,
                    turnover,
                    process_id: processId
                  });
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
            
            // Use transaction client (tx) instead of prisma
            const existingRate = await tx.exchangeRate.findFirst({
              where: {
                fromCurrency,
                toCurrency
              }
            });
            
            if (existingRate) {
              console.log(`💱 Updating Exchange Rate | ${fromCurrency} ➡ ${toCurrency}: ${rateValue}`);
              exchangeRatePromises.push(
                tx.exchangeRate.update({
                  where: { id: existingRate.id },
                  data: { rate: rateValue }
                })
              );
            } else {
              console.log(`💱 Creating Exchange Rate | ${fromCurrency} ➡ ${toCurrency}: ${rateValue}`);
              exchangeRatePromises.push(
                tx.exchangeRate.create({
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

      await tx.userProcess.update({
        where: { id: processId },
        data: { status: ProcessStatus.PENDING}
      });

      if (exchangeRatePromises.length > 0) {
        await Promise.all(exchangeRatePromises);
      }

      if (accountTurnoverData.length > 0) {
        console.log(`Inserting ${accountTurnoverData.length} account turnover records...`);
        
        const chunkSize = 1000;
        for (let i = 0; i < accountTurnoverData.length; i += chunkSize) {
          const chunk = accountTurnoverData.slice(i, i + chunkSize);
          await tx.accountTurnover.createMany({
            data: chunk,
          });
          console.log(`Inserted chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(accountTurnoverData.length/chunkSize)}`);
        }
      }
    }, {
      timeout: 60000, 
    });
     
    console.log('Account turnover and exchange rate processing completed successfully');
  } catch (error) {
    console.error('Error in background processing:', error);
    throw error;
  }
}