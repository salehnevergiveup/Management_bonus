import { NextRequest, NextResponse } from "next/server";
import { smsRateLimiter } from "@/lib/smsRateLimiter";

export async function GET(request: NextRequest) {
  try {
    const status = smsRateLimiter.getStatus();
    
    return NextResponse.json({
      success: true,
      message: "Rate limiter status",
      status: {
        ...status,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("[ERROR] Rate limiter status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 