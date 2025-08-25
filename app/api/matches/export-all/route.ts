import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  return handleExport(request, "GET");
}

export async function POST(request: NextRequest) {
  return handleExport(request, "POST");
}

async function handleExport(request: NextRequest, method: "GET" | "POST") {
  try {
    console.log(`Export all matches route called via ${method}`);
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let processId: string | null;
    let exportType: string | null;
    let selectedIds: string | null;
    let limit: string | null;
    let search: string | null;
    let status: string | null;
    let bonusId: string | null;
    let hasTransferAccount: string | null;
    let notFoundPlayers: string | null;

    if (method === "GET") {
      // Extract from URL parameters
      const { searchParams } = new URL(request.url);
      processId = searchParams.get("processId");
      exportType = searchParams.get("type");
      selectedIds = searchParams.get("selectedIds");
      limit = searchParams.get("limit");
      search = searchParams.get("search");
      status = searchParams.get("status");
      bonusId = searchParams.get("bonus_id");
      hasTransferAccount = searchParams.get("hasTransferAccount");
      notFoundPlayers = searchParams.get("notFoundPlayers");
    } else {
      // Extract from request body
      const body = await request.json();
      processId = body.processId;
      exportType = body.type;
      selectedIds = body.selectedIds;
      limit = body.limit;
      search = body.search;
      status = body.status;
      bonusId = body.bonus_id;
      hasTransferAccount = body.hasTransferAccount;
      notFoundPlayers = body.notFoundPlayers;
    }

    if (!processId) {
      return NextResponse.json({ error: "Process ID is required" }, { status: 400 });
    }

    // Set memory limit for large exports
    const MAX_RECORDS = 50000; // Maximum records to prevent memory issues
    
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

    // Check if we exceed maximum records limit
    if (totalCount > MAX_RECORDS) {
      return NextResponse.json({ 
        error: `Export too large. Found ${totalCount} records, maximum allowed is ${MAX_RECORDS}. Please use filters to reduce the dataset.` 
      }, { status: 413 });
    }

    // Check if we need to apply limits
    const limitNumber = limit ? parseInt(limit) : undefined;
    const shouldLimit = limitNumber && limitNumber > 0;

    if (shouldLimit && totalCount > limitNumber) {
      console.log(`Limiting export to ${limitNumber} records out of ${totalCount} total`);
    }

    // Use chunking for large datasets
    const CHUNK_SIZE = 1000; // Process 1k records at a time (reduced from 5k)
    let allMatches: any[] = [];

    // Determine if we need chunking based on:
    // 1. Limited export with large total count
    // 2. Selected export with many IDs
    // 3. Any export with large total count
    const needsChunking = (
      (shouldLimit && totalCount > CHUNK_SIZE) ||
      (exportType === "selected" && selectedIds && selectedIds.split(",").length > CHUNK_SIZE) ||
      totalCount > CHUNK_SIZE
    );

    if (needsChunking) {
      // Use cursor-based pagination for better performance
      console.log(`Using optimized chunking for large export (${exportType} type, ${totalCount} total records)`);
      
      let processed = 0;
      let lastId = null;
      const maxRecords = shouldLimit ? limitNumber : totalCount;
      
      while (processed < maxRecords) {
        const chunkQuery: any = {
          where: whereClause,
          select: {
            id: true,
            username: true,
            game: true,
            amount: true,
            currency: true,
            status: true,
            comment: true,
            created_at: true,
            process_id: true,
            bonus: {
              select: {
                name: true
              }
            },
            transfer_account: {
              select: {
                username: true
              }
            }
          },
          orderBy: {
            created_at: "desc"
          },
          take: Math.min(CHUNK_SIZE, maxRecords - processed)
        };

        // Use cursor-based pagination instead of skip
        if (lastId) {
          // For selected exports, we need to maintain the ID filter
          if (exportType === "selected" && selectedIds) {
            const selectedIdArray = selectedIds.split(",").filter(id => id.trim());
            chunkQuery.where = {
              ...whereClause,
              id: {
                in: selectedIdArray,
                lt: lastId
              }
            };
          } else {
            chunkQuery.where.id = {
              lt: lastId
            };
          }
        }

        const chunk = await prisma.match.findMany(chunkQuery);

        if (chunk.length === 0) break;

        allMatches.push(...chunk);
        processed += chunk.length;
        lastId = chunk[chunk.length - 1].id;

        console.log(`Processed chunk: ${chunk.length} records, total: ${processed}/${maxRecords}`);
      }
    } else {
      // Use regular query for smaller datasets
      console.log("Using regular query");
      
      allMatches = await prisma.match.findMany({
        where: whereClause,
        select: {
          id: true,
          username: true,
          game: true,
          amount: true,
          currency: true,
          status: true,
          comment: true,
          created_at: true,
          process_id: true,
          bonus: {
            select: {
              name: true
            }
          },
          transfer_account: {
            select: {
              username: true
            }
          }
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

    // Optimized CSV generation to reduce CPU usage and prevent V8 crashes
    const csvHeaders = [
      "ID", "Username", "Game", "Bonus", "Transfer Account", "Amount",
      "Currency", "Status", "Comment", "Created At", "Process ID"
    ];

    // Generate CSV content in chunks to prevent memory issues
    let csvContent = csvHeaders.join(",") + "\n";
    
    // Process records in smaller chunks to prevent V8 crashes
    const CSV_CHUNK_SIZE = 1000;
    
    for (let i = 0; i < allMatches.length; i += CSV_CHUNK_SIZE) {
      const chunk = allMatches.slice(i, i + CSV_CHUNK_SIZE);
      
      for (const match of chunk) {
        try {
          const row = [
            match.id, 
            match.username || "", 
            match.game || "N/A",
            match.bonus?.name || "N/A",
            match.transfer_account?.username || "N/A", 
            match.amount?.toString() || "0",
            match.currency || "", 
            match.status || "", 
            (match.comment || "").replace(/"/g, '""'), // Escape quotes
            new Date(match.created_at).toLocaleString(), 
            match.process_id || ""
          ];
          
          const csvRow = row.map(cell => `"${String(cell)}"`).join(",");
          csvContent += csvRow + "\n";
        } catch (rowError) {
          console.error(`Error processing row ${i}:`, rowError);
          // Continue with next row instead of crashing
          continue;
        }
      }
      
      // Force garbage collection every chunk to prevent memory buildup
      if (global.gc && i % (CSV_CHUNK_SIZE * 5) === 0) {
        global.gc();
      }
    }

    // Clear large arrays to free memory immediately
    allMatches = [];
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

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