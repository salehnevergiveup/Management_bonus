import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from "@/lib/pagination";
import {GetResponse} from "@/types/get-response.type" 
import {prisma} from "@/lib/prisma";

export async function GET(request: Request) {  
    
  const auth = await SessionValidation(); 

  if(!auth) {  
    return NextResponse.json(
        {},  
        {status: 401}
    )
  } 

  try {  
   
    const totalBonuses =  await prisma.bonus.count();

    const paginationResult = await Pagination(
        prisma.bonus,  
        new URL(request.url),  
        totalBonuses,  
        {}
    )
   
    const res: GetResponse =  {  
        data: paginationResult.data,  
        pagination:  paginationResult.pagination, 
        success: true,  
        message: "data fetched successfully"
    }

    return NextResponse.json(
        res,  
        {status: 200}
    )

  }catch(error) {  
    return NextResponse.json(
        {error: "Unable to fetch the bonuses data"},  
        {status: 500}
    )
  }
}