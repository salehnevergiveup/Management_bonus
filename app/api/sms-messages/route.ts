import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SessionValidation } from '@/lib/sessionvalidation';

export async function GET(request: NextRequest) {
  try {
    const auth = await SessionValidation();
    
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: User must be logged in" },
        { status: 401 }
      );
    }

    const messages = await prisma.smsMessage.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      messages
    });

  } catch (error) {
    console.error("[ERROR] Failed to fetch SMS messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await SessionValidation();
    
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: User must be logged in" },
        { status: 401 }
      );
    }

    const { endpoint, message, is_active = false } = await request.json();

    if (!endpoint || !message) {
      return NextResponse.json(
        { error: "Missing required fields: endpoint, message" },
        { status: 400 }
      );
    }

    // If this message is being set as active, deactivate all other messages for this endpoint
    if (is_active) {
      await prisma.smsMessage.updateMany({
        where: { endpoint },
        data: { is_active: false }
      });
    }

    const newMessage = await prisma.smsMessage.create({
      data: {
        endpoint,
        message,
        is_active,
        created_by: auth.id,
        updated_by: auth.id
      }
    });

    return NextResponse.json({
      success: true,
      message: "SMS message created successfully",
      data: newMessage
    });

  } catch (error) {
    console.error("[ERROR] Failed to create SMS message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 