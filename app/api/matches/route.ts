
import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from "@/lib/pagination";
import {GetResponse} from "@/types/get-response.type" 
import ProcessCommand from "@lib/processCommand";
import {ProcessStatus, Roles  } from '@constants/enums';
import {prisma} from "@/lib/prisma";
import { Bonus } from '@/types/bonus.type';
import {ProcessPayload, isProcessPayload} from  "@/types/update-process.type"

export async function GET(request: Request) {
  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" }, 
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("pageSize") || url.searchParams.get("limit") || "10");
  const fetchAll = url.searchParams.get("all") === "true";
  const search = url.searchParams.get("search")?.trim() || "";
  const statusParam = url.searchParams.get("status");
  const statusList = statusParam ? statusParam.split(",").map(s => s.trim().toLowerCase()) : null;
  const hasTransferAccount = url.searchParams.get("hasTransferAccount");
  const notFoundPlayers = url.searchParams.get("notFoundPlayers") === "true";

  // Build where clause
  const where: any = {
    process: {
      status: {
        in: [ProcessStatus.PENDING, ProcessStatus.PROCESSING, ProcessStatus.FAILED]
      }
    }
  };
  if (auth.role !== Roles.Admin) {
    where.process.user_id = auth.id;
  }
  if (statusList && statusList.length > 0) {
    where.status = { in: statusList };
  }
  if (hasTransferAccount === "true") {
    where.transfer_account_id = { not: null };
  } else if (hasTransferAccount === "false") {
    where.transfer_account_id = null;
  }
  if (notFoundPlayers) {
    where.status = "failed";
    where.comment = "unable to find the player";
  }
  if (search) {
    where.OR = [
      { username: { contains: search } },
      { id: { contains: search } },
      { game: { contains: search } },
      { currency: { contains: search } },
      { comment: { contains: search } },
      { transfer_account: { username: { contains: search } } },
      { bonus: { name: { contains: search } } },
    ];
  }

  const query = {
    where,
    include: {
      process: true,
      transfer_account: true,  
      bonus: true
    }
  };

  // Get filtered total
  const total = await prisma.match.count({ where });

  // Use Pagination utility (it will handle skip/take/all)
  const paginationResult = await Pagination(
    prisma.match,
    url,
    total,
    query
  );

  const Res : GetResponse = { 
    data: paginationResult.data,  
    pagination:  paginationResult.pagination, 
    success: true,  
    message: "data fetched successfully"
  }

  return NextResponse.json(
    Res, 
    {status: 200});
}

// this is to create the turnover data the request made from the selenium 
export async function POST(request: Request) {  
  try {  
    const auth = await SessionValidation();

    if (!auth) {  
      return NextResponse.json(
        {message: "Unauthenticated request"},  
        {status: 401}
      );
    }

    const body = await request.json(); 

    if (!body) {  
      return NextResponse.json(
        {error: "Nothing found in the request body"},  
        {status: 400}
      );
    } 

    if (!body.bonus_id || !body.process_id) {  
      return NextResponse.json(
        {error: "Unable to find the bonus_id or process_id"},
        {status: 400}
      );
    }
    const bonusId = body.bonus_id; 
    const processId = body.process_id;  
    
    const matchesWithBonusId = await prisma.match.count({where: {bonus_id: bonusId, process_id: processId}});  
    if (matchesWithBonusId > 0) {  
      return NextResponse.json(
        {error: "Incoming players have been filtered with this bonus already"},
        {status: 400} 
      );
    }
    
    const bonusDB = await prisma.bonus.findUnique({where: {id: bonusId}}); 
    const process = await prisma.userProcess.findUnique({
      where: {
        id: processId, 
        status: ProcessStatus.PENDING
      }
    });
    
    if (!bonusDB) {  
      return NextResponse.json(
        {error: "Unable to find the bonus record"},  
        {status: 404}
      );
    }
    
    if (!process) {  
      return NextResponse.json(
        {error: "Unable to find the process record or process is not in PENDING status"},  
        {status: 404}
      );
    }
    
    const bonus: Bonus = {
      ...bonusDB!,                
      created_at: bonusDB!.created_at.toISOString(),    
      updated_at: bonusDB!.updated_at?.toISOString()
    };
    
    // Call the background process but don't await its completion
    // This is the async part that will continue after response is sent
    await createMatchesData(auth.id, bonus, process.id);
    
    return NextResponse.json(
      {
        success: true, 
        message: "Started processing the match data. This may take some time to complete."
      },
      {status: 202} 
    );

  } catch (error) {  
    console.error("Error initiating match process:", error);
    return NextResponse.json(
      { error: "Server error initiating the match process" },
      { status: 500 }
    );
  }
}

async function createMatchesData(authId: string, bonus: Bonus, processId: string){  

  const bonusResult  =  await ProcessCommand["filter"](authId, bonus);  

  if(!bonusResult) return;  
  if(!bonus.id) return; 

  await ProcessCommand["match"](authId, bonusResult,bonus.id, processId);  

}