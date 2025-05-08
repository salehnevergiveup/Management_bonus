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
    
    // Initialize update data object
    const updateData: any = {
      updated_at: new Date()
    };
    
    if (body.amount !== undefined) {
      const amount = parseFloat(body.amount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { error: "Amount must be a positive number" },
          { status: 400 }
        );
      }
      updateData.amount = amount;
    }
    
    // Handle status update if provided
    if (body.status !== undefined) {
      // Validate status value - only allow valid status options
      const validStatuses = ["pending", "success", "onhold"];
      if (!validStatuses.includes(body.status.toLowerCase())) {
        return NextResponse.json(
          { error: "Status must be one of: pending, success, onhold" },
          { status: 400 }
        );
      }
      updateData.status = body.status.toLowerCase();
    }
    
    if (Object.keys(updateData).length === 1) { 
      return NextResponse.json(
        { error: "No valid fields to update provided" },
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
    
    if (match.status.toLowerCase() === "success" && body.amount !== undefined) {
      return NextResponse.json(
        { error: "Cannot update amount for a match with 'success' status" },
        { status: 403 }
      );
    }
    
    // Update the match
    const updatedMatch = await prisma.match.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json({
      data: updatedMatch,
      success: true,
      message: "Match updated successfully"
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error updating match:", error);
    return NextResponse.json(
      { error: "Failed to update match" },
      { status: 500 }
    );
  }
}