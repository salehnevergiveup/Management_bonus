import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from "@/lib/pagination";
import { GetResponse } from "@/types/get-response.type";
import { prisma } from "@/lib/prisma";
import { AgentAccountStatus } from '@constants/enums';

// Types for the received data structure
interface TurnoverItem {
  game: string;
  turnover: string;
  currency: string;
}

interface TurnoverDataDto {
  data: Record<string, TurnoverItem[]>;
}

interface ExchangeRateItem {
  [toCurrency: string]: string;
}

interface ExchangeRateDto {
  data: Record<string, ExchangeRateItem>;
}

interface AgentAccountData {
  name: string;
  agent_account: string;
  progress: number;
  status: string;
  stage: string;
  exchange_rate: ExchangeRateDto;
  accounts: TurnoverDataDto;
}

export async function GET(request: Request) {
  // const auth = await SessionValidation();
  // if(!auth) {
  //     return NextResponse.json(
  //         { error: "Unauthorized" },
  //         {status: 401}
  //     )
  // }

  try {
    // Get account turnovers with pagination
    const countAccountTurnovers = await prisma.accountTurnover.count();
    
    const paginationResult = await Pagination(
      prisma.accountTurnover,
      new URL(request.url),
      countAccountTurnovers,
      {}
    );

    // Get exchange rates
    const exchangeRates = await prisma.exchangeRate.findMany();

    const res: GetResponse = {
      data: {
        accountTurnovers: paginationResult.data,
        exchangeRates: exchangeRates
      },
      pagination: paginationResult.pagination,
      success: true,
      message: 'data fetched successfully'
    };
    
    return NextResponse.json(res, { status: 200 });
  } catch(error) {
    console.error("Error fetching data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch the account turnovers and exchange rates"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("📥 Incoming payload:", JSON.stringify(body, null, 2));
    
    // Get the first agent account key to process the exchange rates once
    const firstAgentAccountKey = Object.keys(body)[0];
    const firstAgentAccountData: AgentAccountData = body[firstAgentAccountKey];
    
    if (!firstAgentAccountData) {
      console.error("❌ No agent account data found");
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }
    
    // Fire and forget - process data in the background without waiting for completion
    (async () => {
      try {
        // Process each agent account in the request body
        const agentAccountPromises = [];
        const accountTurnoverPromises = [];
        
        for (const agentAccountKey of Object.keys(body)) {
          const agentAccountData: AgentAccountData = body[agentAccountKey];
          
          // Update agent account progress and status
          console.log(`🔁 Processing agent account: ${agentAccountKey}`);
          agentAccountPromises.push(
            prisma.agentAccount.updateMany({
              where: { username: agentAccountData.agent_account },
              data: {
                progress: agentAccountData.progress,
                status: 'no_process',
                updated_at: new Date()
              }
            })
          );
          
          // Process the account turnovers for this agent account
          for (const username in agentAccountData.accounts.data) {
            const accountTurnoverItems = agentAccountData.accounts.data[username];
            
            // Loop through each turnover item for this account
            for (const turnoverItem of accountTurnoverItems) {
              // Remove commas from turnover value and convert to float
              const turnoverValue = parseFloat(turnoverItem.turnover.replace(/,/g, ''));
              
              // Create account turnover record
              console.log(`📊 Turnover | Username: ${username}, Game: ${turnoverItem.game}, Turnover: ${turnoverValue}, Currency: ${turnoverItem.currency}`);
              accountTurnoverPromises.push(
                prisma.accountTurnover.create({
                  data: {
                    username,
                    game: turnoverItem.game,
                    currency: turnoverItem.currency,
                    turnover: turnoverValue
                  }
                })
              );
            }
          }
        }
        
        // Execute all agent account updates
        console.log("📤 Committing agent account updates...");
        await Promise.all(agentAccountPromises);
        
        // Process exchange rates once using the first agent account's data
        const exchangeRatePromises = [];
        
        // Loop through each currency in exchange_rate data from the first agent account
        for (const fromCurrency in firstAgentAccountData.exchange_rate.data) {
          const exchangeRateObj = firstAgentAccountData.exchange_rate.data[fromCurrency];
          
          // Loop through each to-currency
          for (const toCurrency in exchangeRateObj) {
            // Extract rate value (format: "1 : 4.48")
            const rateString = exchangeRateObj[toCurrency];
            const rateValue = parseFloat(rateString.split(':')[1].trim());
            
            // Check if the exchange rate already exists
            const existingRate = await prisma.exchangeRate.findFirst({
              where: {
                fromCurrency,
                toCurrency
              }
            });
            
            if (existingRate) {
              // Update existing exchange rate
              console.log(`💱 Updating Exchange Rate | ${fromCurrency} ➡ ${toCurrency}: ${rateValue}`);
              exchangeRatePromises.push(
                prisma.exchangeRate.update({
                  where: { id: existingRate.id },
                  data: { rate: rateValue }
                })
              );
            } else {
              // Create new exchange rate record
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
        
        // Execute all database operations in parallel
        console.log("📤 Committing turnover & exchange rate entries...");
        await Promise.all([
          ...exchangeRatePromises,
          ...accountTurnoverPromises
        ]);
        
        console.log('✅ Background processing completed successfully');
      } catch(bgErr) {
        console.error('❌ Error in background processing:', bgErr);
      }
    })();
    
    // Return success immediately without waiting for background tasks
    return NextResponse.json(
      {
        success: true,
        message: "Account turnover data processing initiated"
      },
      { status: 202 } // 202 Accepted indicates the request has been accepted for processing
    );
  } catch(err) {
    console.error("❌ Error processing turnover data:", err);
    return NextResponse.json(
      { error: "Unable to process turnover data" },
      { status: 500 }
    );
  }
}
