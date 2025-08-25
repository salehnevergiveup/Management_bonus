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
    const limit = searchParams.get("limit");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const bonusId = searchParams.get("bonus_id");
    const hasTransferAccount = searchParams.get("hasTransferAccount");
    const notFoundPlayers = searchParams.get("notFoundPlayers");

    if (!processId) {
      return NextResponse.json({ error: "Process ID is required" }, { status: 400 });
    }

    let whereClause: any = {
      process_id: processId
    };

    // Add filters based on export type
    if (exportType === "selected" && selectedIds) {
      const selectedIdArray = selectedIds.split(",").filter(id => id.trim());
      whereClause.id = {
        in: selectedIdArray
      };
    } else if (exportType === "filtered") {
      // Add search filter
      if (search) {
        whereClause.username = {
          contains: search,
          mode: 'insensitive'
        };
      }

      // Add status filter
      if (status && status !== "all") {
        whereClause.status = status;
      }

      // Add bonus filter
      if (bonusId && bonusId !== "all") {
        whereClause.bonus_id = bonusId;
      }

      // Add transfer account filter
      if (hasTransferAccount === "true") {
        whereClause.transfer_account_id = {
          not: null
        };
      } else if (hasTransferAccount === "false") {
        whereClause.transfer_account_id = null;
      }

      // Add not found players filter
      if (notFoundPlayers === "true") {
        whereClause.AND = [
          { status: "failed" },
          { comment: "unable to find the player" }
        ];
      }
    }

    console.log("Export all matches query:", { 
      processId, 
      exportType, 
      selectedIds, 
      limit,
      whereClause 
    });

    // First, get the total count to check if we need chunking
    const totalCount = await prisma.match.count({
      where: whereClause
    });

    console.log(`Total matches found: ${totalCount}`);

    // Check if we need to apply limits
    const limitNumber = limit ? parseInt(limit) : undefined;
    const shouldLimit = limitNumber && limitNumber > 0;

    if (shouldLimit && totalCount > limitNumber) {
      console.log(`Limiting export to ${limitNumber} records out of ${totalCount} total`);
    }

    // Use chunking for large datasets
    const CHUNK_SIZE = 5000; // Process 5k records at a time
    let allMatches: any[] = [];

    if (shouldLimit && totalCount > CHUNK_SIZE) {
      // Use chunking for large limited exports
      console.log("Using chunking for large export");
      
      let processed = 0;
      let skip = 0;
      
      while (processed < limitNumber && skip < totalCount) {
        const chunk = await prisma.match.findMany({
          where: whereClause,
          include: {
            bonus: true,
            transfer_account: true,
            process: true
          },
          orderBy: {
            created_at: "desc"
          },
          skip: skip,
          take: Math.min(CHUNK_SIZE, limitNumber - processed)
        });

        allMatches.push(...chunk);
        processed += chunk.length;
        skip += CHUNK_SIZE;

        console.log(`Processed chunk: ${chunk.length} records, total: ${processed}/${limitNumber}`);
      }
    } else {
      // Use regular query for smaller datasets
      console.log("Using regular query");
      
      allMatches = await prisma.match.findMany({
        where: whereClause,
        include: {
          bonus: true,
          transfer_account: true,
          process: true
        },
        orderBy: {
          created_at: "desc"
        },
        ...(shouldLimit && { take: limitNumber })
      });
    }

    if (allMatches.length === 0) {
      return NextResponse.json({ error: "No matches found for this process" }, { status: 404 });
    }

    console.log(`Final export count: ${allMatches.length} records`);

    // Check estimated file size (rough calculation)
    const estimatedSizeInMB = (allMatches.length * 200) / (1024 * 1024); // ~200 bytes per record
    if (estimatedSizeInMB > 8) {
      return NextResponse.json({ 
        error: `Export too large. Estimated size: ${estimatedSizeInMB.toFixed(2)}MB. Please reduce the limit.` 
      }, { status: 413 });
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
    const typeInfo = exportType === "selected" ? "_selected" : exportType === "filtered" ? "_filtered" : "_all";
    const limitInfo = shouldLimit ? `_limit${limitNumber}` : "";
    const filename = `all_matches${processInfo}${typeInfo}${limitInfo}_${timestamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Total-Count": totalCount.toString(),
        "X-Exported-Count": allMatches.length.toString(),
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