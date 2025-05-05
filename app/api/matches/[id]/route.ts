import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await SessionValidation(); 
  
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate the request body
    if (body.amount === undefined) {
      return NextResponse.json(
        { error: "Amount field is required" },
        { status: 400 }
      );
    }
    
    // Parse and validate the amount
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }
    
    // Find the match
    const match = await prisma.match.findUnique({
      where: { id }
    });
    
    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }
    
    // Check if the match status is "success"
    if (match.status.toLowerCase() === "success") {
      return NextResponse.json(
        { error: "Cannot update amount for a match with 'success' status" },
        { status: 403 }
      );
    }
    
    // Update the match
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: {
        amount,
        updated_at: new Date()
      }
    });
    
    return NextResponse.json({
      data: updatedMatch,
      success: true,
      message: "Match amount updated successfully"
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error updating match amount:", error);
    return NextResponse.json(
      { error: "Failed to update match amount" },
      { status: 500 }
    );
  }
}