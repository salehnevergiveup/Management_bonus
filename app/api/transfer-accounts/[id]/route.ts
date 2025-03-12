import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';

const prisma = new PrismaClient();

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json({}, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: "Transfer account ID is required" }, 
        { status: 400 }
      );
    }
    
    const existingAccount = await prisma.transferAccount.findUnique({
      where: { id }
    });
    
    if (!existingAccount) {
      return NextResponse.json(
        { error: "Transfer account not found" }, 
        { status: 404 }
      );
    }
    
    // If updating username, check for uniqueness, but only if the username is different
    if (body.account_username && body.account_username !== existingAccount.account_username) {
      const duplicateUsername = await prisma.transferAccount.findFirst({
        where: { 
          account_username: body.account_username,
          id: { not: id } // Important: exclude the current account from the check
        }
      });
      
      if (duplicateUsername) {
        return NextResponse.json(
          { error: "An account with this username already exists" }, 
          { status: 409 }
        );
      }
    }
    
    const updatedAccount = await prisma.transferAccount.update({
      where: { id },
      data: {
        account_username: body.account_username,
        password: body.password,
        transfer_account: body.transfer_account
      }
    });
    
    return NextResponse.json({
      data: updatedAccount,
      success: true,
      message: "Transfer account updated successfully"
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error updating transfer account:", error);
    return NextResponse.json(
      { error: "Failed to update transfer account" }, 
      { status: 500 }
    );
  }
}


export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json({}, { status: 401 });
  }
  
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: "Transfer account ID is required" }, 
        { status: 400 }
      );
    }
    
    const existingAccount = await prisma.transferAccount.findUnique({
      where: { id }
    });
    
    if (!existingAccount) {
      return NextResponse.json(
        { error: "Transfer account not found" }, 
        { status: 404 }
      );
    }
    
    // Check if the account has associated players
    const playerCount = await prisma.player.count({
      where: { transfer_account_id: id }
    });
    
    if (playerCount > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete transfer account with associated players",
          playerCount
        }, 
        { status: 409 }
      );
    }
    
    await prisma.transferAccount.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      message: "Transfer account deleted successfully"
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error deleting transfer account:", error);
    return NextResponse.json(
      { error: "Failed to delete transfer account" }, 
      { status: 500 }
    );
  }
}