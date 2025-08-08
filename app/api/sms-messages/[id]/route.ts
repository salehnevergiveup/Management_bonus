import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SessionValidation } from '@/lib/sessionvalidation';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await SessionValidation();
    
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: User must be logged in" },
        { status: 401 }
      );
    }

    const { message, is_active } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Missing required field: message" },
        { status: 400 }
      );
    }

    // Get the current message to check if it's active
    const currentMessage = await prisma.smsMessage.findUnique({
      where: { id: id }
    });

    if (!currentMessage) {
      return NextResponse.json(
        { error: "SMS message not found" },
        { status: 404 }
      );
    }

    // If this message is being set as active, deactivate all other messages for this endpoint
    if (is_active) {
      await prisma.smsMessage.updateMany({
        where: { 
          endpoint: currentMessage.endpoint,
          id: { not: id }
        },
        data: { is_active: false }
      });
    }

    const updatedMessage = await prisma.smsMessage.update({
      where: { id: id },
      data: {
        message,
        is_active,
        updated_by: auth.id
      }
    });

    return NextResponse.json({
      success: true,
      message: "SMS message updated successfully",
      data: updatedMessage
    });

  } catch (error) {
    console.error("[ERROR] Failed to update SMS message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await SessionValidation();
    
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: User must be logged in" },
        { status: 401 }
      );
    }

    // Check if the message is active
    const message = await prisma.smsMessage.findUnique({
      where: { id: id }
    });

    if (!message) {
      return NextResponse.json(
        { error: "SMS message not found" },
        { status: 404 }
      );
    }

    if (message.is_active) {
      return NextResponse.json(
        { error: "Cannot delete active message. Please deactivate it first." },
        { status: 400 }
      );
    }

    await prisma.smsMessage.delete({
      where: { id: id }
    });

    return NextResponse.json({
      success: true,
      message: "SMS message deleted successfully"
    });

  } catch (error) {
    console.error("[ERROR] Failed to delete SMS message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 