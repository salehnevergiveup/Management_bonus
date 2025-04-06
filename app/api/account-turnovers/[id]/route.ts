import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await SessionValidation();
  if(!auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;
  
  try {
    // Find the account turnover to ensure it exists
    const turnover = await prisma.accountTurnover.findUnique({
      where: { id }
    });

    if (!turnover) {
      return NextResponse.json(
        { error: "Account turnover not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // Create an object to hold the fields to update
    const updateData: Record<string, any> = {};
    
    // Only include fields that are provided in the request
    if (body.game !== undefined) updateData.game = body.game;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.turnover !== undefined) {
      // Handle turnover as a string with possible commas
      if (typeof body.turnover === 'string') {
        updateData.turnover = parseFloat(body.turnover.replace(/,/g, ''));
      } else {
        updateData.turnover = body.turnover;
      }
    }
    
    // Update the account turnover
    await prisma.accountTurnover.update({
      where: { id },
      data: updateData
    });
    
    // If the agent account username is provided, update its status to completed
    if (body.agent_account) {
      await prisma.agentAccount.updateMany({
        where: { username: body.agent_account },
        data: {
          status: 'completed',
          updated_at: new Date()
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account turnover updated successfully"
      },
      { status: 200 }
    );
  } catch(error) {
    console.error("Error updating account turnover:", error);
    return NextResponse.json(
      { error: "Unable to update the account turnover" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await SessionValidation();
  if(!auth) {
      return NextResponse.json(
          { error: "Unauthorized" },
          {status: 401}
      )
  }

  const { id } = await params;
  
  try {
    // Check if account turnover exists
    const accountTurnover = await prisma.accountTurnover.findUnique({
      where: { id }
    });

    if (!accountTurnover) {
      return NextResponse.json(
        { error: "Account turnover not found" },
        { status: 404 }
      );
    }

    // Delete the account turnover
    await prisma.accountTurnover.delete({
      where: { id }
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account turnover deleted successfully"
      },
      { status: 200 }
    );
  } catch(error) {
    console.error("Error deleting account turnover:", error);
    return NextResponse.json(
      { error: "Unable to delete the account turnover" },
      { status: 500 }
    );
  }
}