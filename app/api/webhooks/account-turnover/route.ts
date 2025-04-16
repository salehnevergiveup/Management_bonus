import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import {  ProcessStatus } from '@constants/enums';
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
  
          for (const agentKey of Object.keys(body)) {
            const agentData = body[agentKey];
  
            // Update agent account status
            agentAccountPromises.push(
              prisma.agentAccount.updateMany({
                where: { username: agentData.agent_account },
                data: {
                  progress: agentData.progress,
                  status: 'no_process',
                  updated_at: new Date()
                }
              })
            );
            
            if (!processId) {
              throw new Error("Missing process ID");
            }
            
            // Handle turnover data
            for (const username in agentData.accounts.data) {
              const turnovers = agentData.accounts.data[username];
              for (const item of turnovers) {
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
  
          await Promise.all(agentAccountPromises);
  
          // Handle exchange rates from first agent only
          const firstAgent = body[Object.keys(body)[0]];
          const exchangeRatePromises = [];
  
          for (const fromCurrency in firstAgent.exchange_rate.data) {
            const targets = firstAgent.exchange_rate.data[fromCurrency];
            for (const toCurrency in targets) {
              const rateValue = parseFloat(targets[toCurrency].split(':')[1].trim());
              const existing = await prisma.exchangeRate.findFirst({
                where: { fromCurrency, toCurrency }
              });
  
              if (existing) {
                exchangeRatePromises.push(
                  prisma.exchangeRate.update({
                    where: { id: existing.id },
                    data: { rate: rateValue }
                  })
                );
              } else {
                exchangeRatePromises.push(
                  prisma.exchangeRate.create({
                    data: { fromCurrency, toCurrency, rate: rateValue }
                  })
                );
              }
            }
          }
  
          await Promise.all([
            ...exchangeRatePromises,
            ...accountTurnoverPromises
          ]);
  
          await prisma.userProcess.update({
            where: { id: processId },
            data: { status: ProcessStatus.PENDING }
          });
  
          console.log("✅ Processed successfully for", processId);
        } catch (bgErr) {
          console.error("❌ Error in background processing:", bgErr);
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