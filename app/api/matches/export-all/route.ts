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
    } else if (exportType === "select_all_matched") {
      // Special case: export all matched records for the process
      // This is safe for large datasets as it uses cursor-based pagination
      whereClause.transfer_account_id = {
        not: null
      };
      console.log("Using 'select_all_matched' export type - will export all matched records");
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
    console.log(`Process ID: ${processId}`);
    console.log(`Export type: ${exportType}`);
    console.log(`Where clause:`, JSON.stringify(whereClause, null, 2));

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

    // For selected exports, use a different approach to avoid cursor pagination issues
    if (exportType === "selected" && selectedIds) {
      console.log(`Using direct ID processing for selected export`);
      
      const selectedIdArray = selectedIds.split(",").filter(id => id.trim());
      console.log(`Selected IDs count: ${selectedIdArray.length}`);
      
      // Use streaming CSV generation to prevent memory accumulation
      const csvChunks: string[] = [];
      const csvHeaders = [
        "ID", "Username", "Game", "Bonus", "Transfer Account", "Amount",
        "Currency", "Status", "Comment", "Created At", "Process ID"
      ];
      csvChunks.push(csvHeaders.join(",") + "\n");
      
      // Process selected IDs in chunks to avoid memory issues
      const CHUNK_SIZE = 1000;
      let processed = 0;
      
      for (let i = 0; i < selectedIdArray.length; i += CHUNK_SIZE) {
        const chunkIds = selectedIdArray.slice(i, i + CHUNK_SIZE);
        console.log(`Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}, IDs ${i + 1} to ${Math.min(i + CHUNK_SIZE, selectedIdArray.length)}`);
        
        const chunk = await prisma.match.findMany({
          where: {
            id: {
              in: chunkIds
            }
          },
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
          }
        });
        
        console.log(`Chunk returned: ${chunk.length} records`);
        
        // Process this chunk immediately and add to CSV
        const chunkRows: string[] = [];
        for (const match of chunk) {
          try {
            const row = [
              match.id, 
              match.username || "", 
              match.game || "N/A",
              (match as any).bonus?.name || "N/A",
              (match as any).transfer_account?.username || "N/A", 
              match.amount?.toString() || "0",
              match.currency || "", 
              match.status || "", 
              (match.comment || "").replace(/"/g, '""'), // Escape quotes
              new Date(match.created_at).toLocaleString(), 
              match.process_id || ""
            ];
            
            const csvRow = row.map(cell => `"${String(cell)}"`).join(",");
            chunkRows.push(csvRow);
          } catch (rowError) {
            console.error(`Error processing row:`, rowError);
            continue;
          }
        }
        
        // Add chunk to CSV and clear immediately
        csvChunks.push(chunkRows.join("\n") + "\n");
        chunkRows.length = 0;
        
        processed += chunk.length;
        console.log(`Processed chunk: ${chunk.length} records, total: ${processed}/${selectedIdArray.length}`);
        
        // Clear chunk immediately to free memory
        chunk.length = 0;
        
        // Force garbage collection every few chunks
        if (global.gc && processed % (CHUNK_SIZE * 3) === 0) {
          global.gc();
        }
      }
      
      // Join all chunks and return
      const csvContent = csvChunks.join("");
      csvChunks.length = 0; // Clear chunks array
      
      console.log(`Final processed count: ${processed} records`);
      console.log(`CSV content length: ${csvContent.length} characters`);
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const processInfo = `_process_${processId}`;
      const typeInfo = "_selected";
      const limitInfo = shouldLimit ? `_limit${limitNumber}` : "";
      const filename = `all_matches${processInfo}${typeInfo}${limitInfo}_${timestamp}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "X-Total-Count": selectedIdArray.length.toString(),
          "X-Exported-Count": processed.toString(),
        },
      });
    }

    // For select_all_matched and other export types, use cursor-based pagination
    if (exportType === "select_all_matched") {
      console.log("Using cursor-based pagination for select_all_matched export");
      
      // Use streaming CSV generation to prevent memory accumulation
      const csvChunks: string[] = [];
      const csvHeaders = [
        "ID", "Username", "Game", "Bonus", "Transfer Account", "Amount",
        "Currency", "Status", "Comment", "Created At", "Process ID"
      ];
      csvChunks.push(csvHeaders.join(",") + "\n");
      
      // Use cursor-based pagination for safe handling of large datasets
      const CURSOR_CHUNK_SIZE = 1000;
      let cursor: string | undefined;
      let processed = 0;
      let hasMore = true;
      
      while (hasMore) {
        const chunk = await prisma.match.findMany({
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
          take: CURSOR_CHUNK_SIZE,
          ...(cursor && { cursor: { id: cursor } })
        });
        
        if (chunk.length === 0) {
          hasMore = false;
          break;
        }
        
        console.log(`Processing cursor chunk: ${chunk.length} records, total processed: ${processed}`);
        
        // Process this chunk immediately and add to CSV
        const chunkRows: string[] = [];
        for (const match of chunk) {
          try {
            const row = [
              match.id, 
              match.username || "", 
              match.game || "N/A",
              (match as any).bonus?.name || "N/A",
              (match as any).transfer_account?.username || "N/A", 
              match.amount?.toString() || "0",
              match.currency || "", 
              match.status || "", 
              (match.comment || "").replace(/"/g, '""'), // Escape quotes
              new Date(match.created_at).toLocaleString(), 
              match.process_id || ""
            ];
            
            const csvRow = row.map(cell => `"${String(cell)}"`).join(",");
            chunkRows.push(csvRow);
          } catch (rowError) {
            console.error(`Error processing row:`, rowError);
            continue;
          }
        }
        
        // Add chunk to CSV and clear immediately
        csvChunks.push(chunkRows.join("\n") + "\n");
        chunkRows.length = 0;
        
        processed += chunk.length;
        
        // Update cursor for next iteration
        cursor = chunk[chunk.length - 1]?.id;
        
        // Clear chunk immediately to free memory
        chunk.length = 0;
        
        // Force garbage collection every few chunks
        if (global.gc && processed % (CURSOR_CHUNK_SIZE * 3) === 0) {
          global.gc();
        }
        
        // Check if we've reached the limit
        if (shouldLimit && processed >= limitNumber) {
          console.log(`Reached limit of ${limitNumber} records`);
          break;
        }
      }
      
      // Join all chunks and return
      const csvContent = csvChunks.join("");
      csvChunks.length = 0; // Clear chunks array
      
      console.log(`Final processed count: ${processed} records`);
      console.log(`CSV content length: ${csvContent.length} characters`);
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const processInfo = `_process_${processId}`;
      const typeInfo = "_select_all_matched";
      const limitInfo = shouldLimit ? `_limit${limitNumber}` : "";
      const filename = `all_matches${processInfo}${typeInfo}${limitInfo}_${timestamp}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "X-Total-Count": totalCount.toString(),
          "X-Exported-Count": processed.toString(),
        },
      });
    }

    // For other export types, use regular query
    console.log("Using regular query for non-selected export");
    
    const allMatches = await prisma.match.findMany({
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

    // Use streaming approach to prevent memory accumulation
    const csvChunks: string[] = [];
    csvChunks.push(csvHeaders.join(",") + "\n");
    
    // Process records in smaller chunks to prevent V8 crashes
    const CSV_CHUNK_SIZE = 1000;
    
    for (let i = 0; i < allMatches.length; i += CSV_CHUNK_SIZE) {
      const chunk = allMatches.slice(i, i + CSV_CHUNK_SIZE);
      const chunkRows: string[] = [];
      
      for (const match of chunk) {
        try {
          const row = [
            match.id, 
            match.username || "", 
            match.game || "N/A",
            (match as any).bonus?.name || "N/A",
            (match as any).transfer_account?.username || "N/A", 
            match.amount?.toString() || "0",
            match.currency || "", 
            match.status || "", 
            (match.comment || "").replace(/"/g, '""'), // Escape quotes
            new Date(match.created_at).toLocaleString(), 
            match.process_id || ""
          ];
          
          const csvRow = row.map(cell => `"${String(cell)}"`).join(",");
          chunkRows.push(csvRow);
        } catch (rowError) {
          console.error(`Error processing row ${i}:`, rowError);
          // Continue with next row instead of crashing
          continue;
        }
      }
      
      // Add chunk to CSV and clear chunkRows immediately
      csvChunks.push(chunkRows.join("\n") + "\n");
      chunkRows.length = 0; // Clear chunk array
      
      // Force garbage collection every chunk to prevent memory buildup
      if (global.gc && i % (CSV_CHUNK_SIZE * 5) === 0) {
        global.gc();
      }
    }

    // Join all chunks at the end (minimal memory impact)
    const csvContent = csvChunks.join("");
    
    // Clear all arrays immediately
    csvChunks.length = 0;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const processInfo = `_process_${processId}`;
    const typeInfo = exportType === "filtered" ? "_filtered" : "_all";
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
    console.error("Export error:", error);
    return NextResponse.json({ 
      error: "Failed to export matches. Please try again." 
    }, { status: 500 });
  }
} 