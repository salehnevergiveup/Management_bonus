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

    const logs = await prisma.smsSendLog.findMany({
      orderBy: {
        created_at: 'desc'
      },
      take: 50 // Limit to last 50 entries
    });

    return NextResponse.json({
      success: true,
      logs
    });

  } catch (error) {
    console.error("[ERROR] Failed to fetch SMS send logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 