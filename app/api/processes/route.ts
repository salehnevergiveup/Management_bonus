import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { PrismaClient } from "@prisma/client";
import { ProcessStatus } from "@/constants/processStatus";
import crypto from 'crypto';
import {Roles} from '@/constants/roles';


const prisma = new PrismaClient();

export async function GET(request: Request) {  
  const session = await getServerSession(authOptions);  

  if(!session) {  
    return  NextResponse.json(
      {},  
      {status: 401}
    );
  }

  const auth = session?.user;  
  if(!auth) {  
    return  NextResponse.json(
      {},  
      {status: 401}
    );
  }
  try {  
    const url = new URL(request.url);
    const limit  =  parseInt(url.searchParams.get("limit") || "50");  
    const page = parseInt(url.searchParams.get("page")|| "1");  

    //calc the page 
    const skip  = (page -1) * limit;  
    const total = await prisma.userProcess.count();
    
    const filters =  auth.role ==  Roles.Admin?{} :  {user_id: auth.id};
    const processes  = await prisma.userProcess.findMany({
        where: filters,
        include: {
          user: true
        },
        skip,
        take: limit
      });

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    const activeProcess = await prisma.userProcess.count({where: {status: ProcessStatus.PROCESSING}});  
  
    return  NextResponse.json({
      data: processes,  
      success: true, 
      activeProcess: Boolean(activeProcess),
      pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
      message: "Process created and initiated successfully" }, {status: 200});  
  }catch(error) {  
    return NextResponse.json({ error: "Internal server error" }, {status: 500})
  }
 
} 
