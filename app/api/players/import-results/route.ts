import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the most recent failed import results for this user
    const failedRecords = await prisma.importFailure.findMany({
      where: {
        user_id: session.user.id
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 1000 // Limit to most recent 1000 failures
    });

    if (failedRecords.length === 0) {
      return NextResponse.json({
        success: true,
        failedRecords: [],
        message: "No failed import results found"
      });
    }

    // Group by import session and get the most recent session
    const sessions = [...new Set(failedRecords.map(r => r.import_session_id))];
    const mostRecentSession = sessions[0]; // Since we ordered by desc, first is most recent

    const recentFailures = failedRecords.filter(r => r.import_session_id === mostRecentSession);
    const importTime = recentFailures.length > 0 ? recentFailures[0].created_at : null;

    return NextResponse.json({
      success: true,
      failedRecords: recentFailures.map(record => ({
        username: record.username,
        account: record.account,
        reason: record.reason
      })),
      importTime: importTime,
      failureCount: recentFailures.length,
      message: `Found ${recentFailures.length} failed records from recent import`
    });

  } catch (error) {
    console.error("Error retrieving import results:", error);
    return NextResponse.json(
      { error: "Failed to retrieve import results" },
      { status: 500 }
    );
  }
} 