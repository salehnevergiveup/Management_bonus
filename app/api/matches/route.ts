import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from "@/lib/pagination";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" }, 
      { status: 401 }
    );
  }

  const query  = {
    include: {process: true, player: true}
  }

  const total = await prisma.match.count();

  const paginationResult = await Pagination(
    prisma.match,
    new URL(request.url), 
    total,  
    query
  );
  
  return NextResponse.json({
    data: paginationResult.data,
    success: true,
    pagination: {
      total: paginationResult.total,
      page: paginationResult.page,
      limit: paginationResult.limit,
      totalPages: paginationResult.totalPages,
      hasNextPage: paginationResult.hasNextPage,
      hasPreviousPage: paginationResult.hasPreviousPage,
    }
  }, { status: 200 });
}