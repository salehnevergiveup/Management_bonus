import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    console.log("Export all matches route called");
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const processId = searchParams.get("processId");
    const exportType = searchParams.get("type");
    const selectedIds = searchParams.get("selectedIds");

    if (!processId) {
      return NextResponse.json({ error: "Process ID is required" }, { status: 400 });
    }

    let whereClause: any = {
      process_id: processId
    };

    if (exportType === "selected" && selectedIds) {
      const selectedIdArray = selectedIds.split(",").filter(id => id.trim());
      whereClause.id = {
        in: selectedIdArray
      };
    }

    console.log("Export all matches query:", { processId, exportType, selectedIds, whereClause });

    // Use streaming to avoid blocking
    const allMatches = await prisma.match.findMany({
      where: whereClause,
      include: {
        bonus: true,
        transfer_account: true,
        process: true
      },
      orderBy: {
        created_at: "desc"
      }
    });

    if (allMatches.length === 0) {
      return NextResponse.json({ error: "No matches found for this process" }, { status: 404 });
    }

    const csvHeaders = [
      "ID", "Username", "Game", "Bonus", "Transfer Account", "Amount",
      "Currency", "Status", "Comment", "Created At", "Process ID"
    ];

    const csvRows = allMatches.map(match => [
      match.id, 
      match.username, 
      match.game, 
      match.bonus?.name || "N/A",
      match.transfer_account?.username || "N/A", 
      match.amount.toString(),
      match.currency, 
      match.status, 
      match.comment || "",
      new Date(match.created_at).toLocaleString(), 
      match.process_id
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const timestamp = new Date().toISOString().split('T')[0];
    const processInfo = `_process_${processId}`;
    const typeInfo = exportType === "selected" ? "_selected" : "_all";
    const filename = `all_matches${processInfo}${typeInfo}_${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("Error exporting all matches:", error);
    return NextResponse.json(
      { error: "Failed to export matches" },
      { status: 500 }
    );
  }
} 