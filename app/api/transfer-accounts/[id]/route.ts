import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json({}, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { id } = await params;
    
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
    
    // Check for duplicate username
    if (body.username && body.username !== existingAccount.username) {
      const duplicateUsername = await prisma.transferAccount.findFirst({
        where: {
          username: body.username,
          id: { not: id }
        }
      });
      
      if (duplicateUsername) {
        return NextResponse.json(
          { error: "An account with this username already exists" },
          { status: 409 }
        );
      }
    }
    
    // If parent_id is provided and changing, verify it exists
    if (body.parent_id && body.parent_id !== existingAccount.parent_id) {
      const parentAccount = await prisma.transferAccount.findUnique({
        where: { id: body.parent_id }
      });
      
      if (!parentAccount) {
        return NextResponse.json(
          { error: "Parent account not found" },
          { status: 404 }
        );
      }
      
      // Prevent circular reference
      if (body.parent_id === id) {
        return NextResponse.json(
          { error: "Account cannot be its own parent" },
          { status: 400 }
        );
      }
    }
    
    const updatedAccount = await prisma.transferAccount.update({
      where: { id },
      data: {
        username: body.username,
        password: body.password,
        status: body.status,
        progress: body.progress,
        type: body.type,
        process_id: body.process_id,
        parent_id: body.parent_id
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

export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json({}, { status: 401 });
  }
  
  try {
    const { id } = await params;
    
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
    
    // Check if account has associated players
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
    
    // Check if account has associated matches
    const matchCount = await prisma.match.count({
      where: { transfer_account_id: id }
    });
    
    if (matchCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete transfer account with associated matches",
          matchCount
        },
        { status: 409 }
      );
    }
    
    // Check if account has sub-accounts
    const subAccountCount = await prisma.transferAccount.count({
      where: { parent_id: id }
    });
    
    if (subAccountCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete account with associated sub-accounts",
          subAccountCount
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