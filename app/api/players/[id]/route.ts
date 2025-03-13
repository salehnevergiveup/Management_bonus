import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import {prisma} from "@/lib/prisma";

export async function PUT(request: Request, { params }:{ params: Promise<{ id: string }> }) {
  
  const auth = await SessionValidation(); 
  
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    
    if (!body.account_username && !body.transfer_account_id) {
      return NextResponse.json(
        { error: "At least one field to update must be provided" },
        { status: 400 }
      );
    }
    const  {id} = await params;
    const player = await prisma.player.findUnique({
      where: { id: id}
    });
    
    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }
    
    if (body.transfer_account_id) {
      const transferAccount = await prisma.transferAccount.findUnique({
        where: { id: body.transfer_account_id }
      });
      
      if (!transferAccount) {
        return NextResponse.json(
          { error: "Transfer account not found" },
          { status: 404 }
        );
      }
    }
    
    const { id: id1 } = await params;
    
    const updatedPlayer = await prisma.player.update({
      where: { id: id1 },
      data: {
        ...(body.account_username && { account_username: body.account_username }),
        ...(body.transfer_account_id && { transfer_account_id: body.transfer_account_id })
      }
    });
    
    return NextResponse.json({
      data: updatedPlayer,
      success: true,
      message: "Player updated successfully"
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error updating player:", error);
    return NextResponse.json(
      { error: "Failed to update player" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await SessionValidation(); 
  
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const {id} = await params; 
  try {
    const player = await prisma.player.findUnique({ where: { id: id} }); 
    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 } 
      );
    }
    
    await prisma.player.delete({ where: { id: id} }); 
    
    return NextResponse.json(
      {
        success: true,
        message: "Player deleted successfully"
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting player:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 } 
    );
  }
}