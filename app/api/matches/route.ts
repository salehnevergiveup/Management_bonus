
import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from "@/lib/pagination";
import {GetResponse} from "@/types/get-response.type" 
import ProcessCommand from "@lib/processCommand";
import { MatchStatus, ProcessStatus, Roles  } from '@constants/enums';
import {prisma} from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" }, 
      { status: 401 }
    );
  }

  const query  = {
                  where: {
                    process: {
                      status: {
                        in: [ProcessStatus.SEM_COMPLETED, ProcessStatus.PENDING]
                      }
                    
                    }
                  },
                  include: {
                    process: true,
                    player: true
                  }
                }
  if(auth.role  !== Roles.Admin) {  
    if (auth.role !== Roles.Admin) {
      query.where.process = {
        ...query.where.process,
        user_id: auth.id  
      }
    }
  }
  const total = await prisma.match.count();

  const paginationResult = await Pagination(
    prisma.match,
    new URL(request.url), 
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

export async function POST(request: Request) {  
  try {  
    const auth  = await SessionValidation();

    if(!auth) {  
      return  NextResponse.json(
        {message: "Unauthenticated request"},  
        {status:401}
      )
    }
    
    //async process 
    ProcessCommand["rematch"](auth.id)
    .catch(err=>  console.error(`Background rematch process error for match`, err));  

    return NextResponse.json(
      {message: "rematch Process started"},  
      {status: 202}
    )

  }catch(error) {  
  console.error("Error initiating rematch process:", error);
  return NextResponse.json(
    { message: "Server error initiating the rematch process" },
    { status: 500 }
  );
  }
}