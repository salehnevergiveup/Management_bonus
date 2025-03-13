import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from "@/lib/pagination";
import {GetResponse} from "@/types/get-response.type" 
import {prisma} from "@/lib/prisma"

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

  const Res : GetResponse = { 
    data: paginationResult.data,  
    pagination:  paginationResult.pagination, 
    success: true,  
    message: "data fetched successfully"
  }

  return NextResponse.json(Res, {status: 200});
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
    
    if (!body.account_username || !body.password || !body.transfer_account) {
      return NextResponse.json(
        { error: "Account username, password and transfer account name are required" }, 
        { status: 400 }
      );
    }
    
    const existingAccount = await prisma.transferAccount.findUnique({
      where: { account_username: body.account_username }
    });
    
    if (existingAccount) {
      return NextResponse.json(
        { error: "An account with this username already exists" }, 
        { status: 409 }
      );
    }
    
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
