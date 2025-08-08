import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ endpoint: string }> }
) {
  try {
    const { endpoint } = await params;
    const activeMessage = await prisma.smsMessage.findFirst({
      where: {
        endpoint: endpoint,
        is_active: true
      }
    });

    if (!activeMessage) {
      return NextResponse.json({
        success: false,
        message: `No active message found for endpoint: ${endpoint}`,
        data: null
      });
    }

    return NextResponse.json({
      success: true,
      message: "Active message found",
      data: activeMessage
    });

  } catch (error) {
    console.error("[ERROR] Failed to fetch active SMS message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 