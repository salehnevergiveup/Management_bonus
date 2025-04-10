import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { prisma } from "@/lib/prisma";

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
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Transfer account ID is required" },
        { status: 400 }
      );
    }
    
    const existingAccount = await prisma.transferAccount.findUnique({
      where: { id },
      include: { sub_accounts: true } // Include sub_accounts to check for children
    });
    
    if (!existingAccount) {
      return NextResponse.json(
        { error: "Transfer account not found" },
        { status: 404 }
      );
    }
    
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
    
    // Prevent updating type or parent_id if the account has children
    if (existingAccount.sub_accounts.length > 0) {
      if (body.type && body.type !== existingAccount.type) {
        return NextResponse.json(
          { error: "Cannot change account type when account has sub-accounts" },
          { status: 400 }
        );
      }
      
      if (body.parent_id && body.parent_id !== existingAccount.parent_id) {
        return NextResponse.json(
          { error: "Cannot change parent account when account has sub-accounts" },
          { status: 400 }
        );
      }
    }
    
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
      
      if (body.parent_id === id) {
        return NextResponse.json(
          { error: "Account cannot be its own parent" },
          { status: 400 }
        );
      }
    }
    
    const updateData: any = {};
    
    if (body.username !== undefined) updateData.username = body.username;
    if (body.password !== undefined) updateData.password = body.password;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.progress !== undefined) updateData.progress = body.progress;
    if (body.pin_code !== undefined) updateData.pin_code = body.pin_code;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.parent_id !== undefined) updateData.parent_id = body.parent_id;
    
    const updatedAccount = await prisma.transferAccount.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json({
      data: updatedAccount,
      success: true,
      message: "Transfer account updated successfully"
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error updating transfer account:", error);
    return NextResponse.json(
      { error: "Failed to update transfer account", details: error instanceof Error ? error.message : String(error) },
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