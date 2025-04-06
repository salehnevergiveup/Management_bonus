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

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const parentId = url.searchParams.get('parent_id');
  
  const where: any = {};
  
  if (type) {
    where.type = type;
  }
  
  if (parentId) {
    where.parent_id = parentId;
  }

  const total = await prisma.transferAccount.count({ where });

  const paginationResult = await Pagination(
    prisma.transferAccount,
    url, 
    total,
    { where }
  );

  const Res: GetResponse = { 
    data: paginationResult.data,  
    pagination: paginationResult.pagination, 
    success: true,  
    message: "data fetched successfully"
  };

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
    
    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: "Account username and password are required" }, 
        { status: 400 }
      );
    }
    
    const existingAccount = await prisma.transferAccount.findUnique({
      where: { username: body.username }
    });
    
    if (existingAccount) {
      return NextResponse.json(
        { error: "An account with this username already exists" }, 
        { status: 409 }
      );
    }
    
    // Validate parent_id if provided
    if (body.parent_id) {
      const parentAccount = await prisma.transferAccount.findUnique({
        where: { id: body.parent_id }
      });
      
      if (!parentAccount) {
        return NextResponse.json(
          { error: "Parent account not found" }, 
          { status: 404 }
        );
      }
    }
    
    const newAccount = await prisma.transferAccount.create({
      data: {
        username: body.username,
        password: body.password,
        status: body.status || "no process",
        progress: body.progress,
        type: body.type || "sub_account",
        parent_id: body.parent_id,
        process_id: body.process_id
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