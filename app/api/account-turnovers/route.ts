import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from "@/lib/pagination";
import { GetResponse } from "@/types/get-response.type";
import { prisma } from "@/lib/prisma";
import { AgentAccountStatus, ProcessStatus } from '@constants/enums';
import { verifyApi } from '@lib/apikeysHandling';

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
  try {
    const auth = await SessionValidation();
    if(!auth) {
        return NextResponse.json(
            { error: "Unauthorized" },
            {status: 401}
        )
    }
    // Get account turnovers with pagination
    const countAccountTurnovers = await prisma.accountTurnover.count();
    const query  = { 
      process : {  
        where:  {  
          status: ProcessStatus.PENDING
        }
      }
    }
    const paginationResult = await Pagination(
      prisma.accountTurnover,
      new URL(request.url),
      countAccountTurnovers,
      query
    );

    // Get exchange rates
    const exchangeRates = await prisma.exchangeRate.findMany();

    const res: any = {
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