import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from "@/lib/pagination";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json(
      {}, 
      {status: 401}
    );
  }

   const total = await prisma.transferAccount.count();

   const paginationResult = await Pagination(
     prisma.transferAccount,
     new URL(request.url), 
     total,
     {}
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
  }, {status: 200});
}

export async function POST(request: Request) {
  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json(
      {}, 
      {status: 401}
    );
  }
  
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.account_username || !body.password || !body.transfer_account) {
      return NextResponse.json(
        { error: "Account username, password and transfer account name are required" }, 
        { status: 400 }
      );
    }
    
    // Check if account with this username already exists
    const existingAccount = await prisma.transferAccount.findUnique({
      where: { account_username: body.account_username }
    });
    
    if (existingAccount) {
      return NextResponse.json(
        { error: "An account with this username already exists" }, 
        { status: 409 }
      );
    }
    
    // Create the transfer account
    const newAccount = await prisma.transferAccount.create({
      data: {
        account_username: body.account_username,
        password: body.password,
        transfer_account: body.transfer_account
      }
    });
    
    return NextResponse.json({
      data: newAccount,
      success: true,
      message: "Transfer account created successfully"
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error creating transfer account:", error);
    return NextResponse.json(
      { error: "Failed to create transfer account" }, 
      { status: 500 }
    );
  }
}
