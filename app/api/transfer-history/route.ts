import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from "@/lib/pagination";
import { GetResponse } from "@/types/get-response.type";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json(
      {}, 
      {status: 401}
    );
  }

  const total = await prisma.transferHistory.count();

  const paginationResult = await Pagination(
    prisma.transferHistory,
    new URL(request.url), 
    total,
    { 
      include: {
        transfer_account: {
          select: {
            id: true,
            username: true
          }
        },
        process: {
          select: {
            id: true,
            status: true
          }
        },
        bonus: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }
  );

  const Res: GetResponse = { 
    data: paginationResult.data,  
    pagination: paginationResult.pagination, 
    success: true,  
    message: "Transfer history fetched successfully"
  };

  return NextResponse.json(Res, {status: 200});
}