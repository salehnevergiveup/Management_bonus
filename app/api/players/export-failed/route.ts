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

    // Get failed records for this user
    const failedRecords = await prisma.importFailure.findMany({
      where: {
        user_id: session.user.id
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (failedRecords.length === 0) {
      return NextResponse.json({ error: "No failed records found" }, { status: 404 });
    }

    // Create CSV content
    const headers = ["Username", "Account", "Reason"];
    const csvContent = [
      headers.join(","),
      ...failedRecords.map((record: any) => 
        `"${record.username}","${record.account}","${record.reason}"`
      )
    ].join("\n");

    // Clean up the failed records after export
    await prisma.importFailure.deleteMany({
      where: {
        user_id: session.user.id
      }
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `failed_import_${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("Error exporting failed records:", error);
    return NextResponse.json(
      { error: "Failed to export failed records" },
      { status: 500 }
    );
  }
} 