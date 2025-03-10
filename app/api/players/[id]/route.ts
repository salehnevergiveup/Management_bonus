import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
    
    const player = await prisma.player.findUnique({
      where: { id: params.id }
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
    
    const updatedPlayer = await prisma.player.update({
      where: { id: params.id },
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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await SessionValidation(); 
  
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const player = await prisma.player.findUnique({ where: { id: params.id } }); 
    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 } 
      );
    }
    
    await prisma.player.delete({ where: { id: params.id } }); 
    
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