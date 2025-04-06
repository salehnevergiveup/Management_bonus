import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from "@/lib/pagination";
import {GetResponse} from "@/types/get-response.type" 
import {prisma} from "@/lib/prisma";

export async function GET(request: Request) {

  const auth = await SessionValidation();
   
   if (!auth) {
     return NextResponse.json(
       {}, 
       {status: 401}
     );
   }
  
   
   const query  = {
     include: {transferAccount: true}
   }

   const total = await prisma.player.count();

   const paginationResult = await Pagination(
     prisma.player,
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

  const auth = await SessionValidation();
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" }, 
      { status: 401 }
    );
  }
  
  try {
    const player = await request.json();  

    if (!player.account_username || !player.transfer_account_id) {  
      return NextResponse.json(
        { error: "Missing username or transfer account id" },  
        { status: 400 } 
      );
    }

    const username = player.account_username;  
    const transferAccountId = player.transfer_account_id;  

    const transferAccount = await prisma.transferAccount.findUnique({  
      where: { id: transferAccountId }
    }); 

    if (!transferAccount) { 
      return NextResponse.json(
        { error: "This transfer account is invalid" },
        { status: 404 } 
      );
    }

    const newPlayer = await prisma.player.create({ 
      data: {
        account_username: username,  
        transfer_account_id: transferAccountId
      }
    });

    return NextResponse.json({
      data: newPlayer,
      success: true,
      message: "Player created successfully"
    }, 
    { status: 201 });  
  } catch (error) { 
    console.error("Error creating player:", error);
    return NextResponse.json(
      { error: "Failed to create player" },  
      { status: 500 }
    );
  }
}