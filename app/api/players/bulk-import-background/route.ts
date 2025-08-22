import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { prisma } from "@/lib/prisma";
import { ProcessCommand } from "@/lib/processCommand";
import { NotificationType } from "@/constants/enums";

// In-memory tracking for rate limiting (in production, use Redis)
const userImportSessions = new Map<string, { count: number; lastImport: number }>();
const globalImportCount = { count: 0, lastReset: Date.now() };

// Reset global counter every hour
setInterval(() => {
  globalImportCount.count = 0;
  globalImportCount.lastReset = Date.now();
}, 60 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const now = Date.now();

    // Rate limiting per user
    const userSession = userImportSessions.get(userId) || { count: 0, lastImport: 0 };
    if (now - userSession.lastImport < 2 * 60 * 1000) { // 2 minutes
      return NextResponse.json({ 
        error: "Please wait 2 minutes between imports to prevent system overload. This helps maintain performance for all users." 
      }, { status: 429 });
    }

    if (userSession.count >= 1) { // Max 1 concurrent import per user
      return NextResponse.json({ 
        error: "You have an active import in progress. Please wait for it to complete before starting a new one. This prevents data conflicts and ensures reliable processing." 
      }, { status: 429 });
    }

    // Global concurrency limit
    if (globalImportCount.count >= 10) { // Max 10 concurrent imports system-wide
      return NextResponse.json({ 
        error: "System is currently busy with other import processes. Maximum 10 concurrent imports allowed system-wide. Please try again in a few minutes." 
      }, { status: 503 });
    }

    const body = await request.json();
    const { players } = body;

    if (!Array.isArray(players)) {
      return NextResponse.json({ error: "Invalid players data" }, { status: 400 });
    }

    if (players.length === 0) {
      return NextResponse.json({ error: "No players to import" }, { status: 400 });
    }

    // Per import limit
    if (players.length > 30000) {
      return NextResponse.json({ 
        error: "File too large. Maximum 30,000 records allowed per import process. Please split your file into smaller chunks." 
      }, { status: 400 });
    }

    // Check daily limit for user
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const userDailyImports = await prisma.player.count({
      where: {
        created_at: {
          gte: today
        }
      }
    });

    if (userDailyImports + players.length > 20000) {
      return NextResponse.json({ 
        error: "Daily import limit exceeded. Maximum 20,000 records per day per user. Please try again tomorrow or contact support." 
      }, { status: 429 });
    }

    // Update tracking
    userSession.count++;
    userSession.lastImport = now;
    userImportSessions.set(userId, userSession);
    globalImportCount.count++;

    // Fire and forget: Start background processing
    processPlayersInBackground(userId, players).catch(error => {
      console.error("Background import process failed:", error);
      ProcessCommand["notify all"](
        userId,
        `Player import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        NotificationType.ERROR
      );
    }).finally(() => {
      // Decrease counters when process completes
      const currentSession = userImportSessions.get(userId);
      if (currentSession) {
        currentSession.count = Math.max(0, currentSession.count - 1);
        userImportSessions.set(userId, currentSession);
      }
      globalImportCount.count = Math.max(0, globalImportCount.count - 1);
    });

    return NextResponse.json({
      success: true,
      message: "Player import started. You will be notified when it's complete.",
      totalPlayers: players.length
    });

  } catch (error) {
    console.error("Error starting bulk import:", error);
    return NextResponse.json(
      { error: "Failed to start import process" },
      { status: 500 }
    );
  }
}

async function processPlayersInBackground(userId: string, players: Array<{ username: string; account: string }>) {
  const results = {
    success: 0,
    failed: [] as Array<{ username: string; account: string; reason: string }>
  };

  try {
    // Check current player count in database
    const currentPlayerCount = await prisma.player.count();
    
    // Notify user that import has started
    await ProcessCommand["notify all"](
      userId,
      `Player import started. Processing ${players.length} records...`,
      NotificationType.INFO
    );

    // Process players in batches to avoid blocking
    const batchSize = 50; // Reduced batch size for better memory management
    const totalBatches = Math.ceil(players.length / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, players.length);
      const batch = players.slice(startIndex, endIndex);

      // Prepare batch data for efficient insertion
      const playersToCreate: Array<{ account_username: string; transfer_account_id: string }> = [];
      const existingUsernames = new Set<string>();
      
      // First, check for existing players in this batch
      const usernamesToCheck = batch.map(p => p.username.trim());
      const existingPlayers = await prisma.player.findMany({
        where: {
          account_username: { in: usernamesToCheck }
        },
        select: { account_username: true }
      });
      
      existingPlayers.forEach(p => existingUsernames.add(p.account_username.toLowerCase()));
      
      // Get all unique transfer account usernames from this batch
      const transferAccountUsernames = [...new Set(batch.map(p => p.account.trim()))];
      const transferAccounts = await prisma.transferAccount.findMany({
        where: {
          username: { in: transferAccountUsernames },
          type: { not: "main_account" }
        },
        select: { id: true, username: true }
      });
      
      const transferAccountMap = new Map(
        transferAccounts.map(ta => [ta.username.toLowerCase(), ta.id])
      );
      
      // Process each player in the batch
      for (const player of batch) {
        const cleanUsername = player.username.trim();
        const cleanAccount = player.account.trim();
        
        // Check if player already exists
        if (existingUsernames.has(cleanUsername.toLowerCase())) {
          results.failed.push({
            username: cleanUsername,
            account: cleanAccount,
            reason: "Player already exists"
          });
          continue;
        }
        
        // Check if transfer account exists
        const transferAccountId = transferAccountMap.get(cleanAccount.toLowerCase());
        if (!transferAccountId) {
          results.failed.push({
            username: cleanUsername,
            account: cleanAccount,
            reason: "Transfer account not found"
          });
          continue;
        }
        
        // Add to batch for insertion
        playersToCreate.push({
          account_username: cleanUsername,
          transfer_account_id: transferAccountId
        });
      }
      
      // Batch insert all valid players
      if (playersToCreate.length > 0) {
        try {
          await prisma.player.createMany({
            data: playersToCreate,
            skipDuplicates: true // Extra safety in case of race conditions
          });
          results.success += playersToCreate.length;
        } catch (error) {
          console.error("Error in batch player creation:", error);
          // If batch insert fails, fall back to individual inserts
          for (const playerData of playersToCreate) {
            try {
              await prisma.player.create({ data: playerData });
              results.success++;
            } catch (individualError) {
              results.failed.push({
                username: playerData.account_username,
                account: "Unknown",
                reason: "Database error during batch insert"
              });
            }
          }
        }
      }

      // Allow other operations to proceed and reduce memory pressure
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Log progress for large imports
      if (players.length > 1000 && batchIndex % 10 === 0) {
        // Progress logged silently
      }
    }

    // Send final notification with summary only
    const successMessage = `Player import completed! Successfully imported ${results.success} players.`;
    const failureMessage = results.failed.length > 0 
      ? ` Failed to import ${results.failed.length} players.`
      : "";

    // Import completed silently

    await ProcessCommand["notify all"](
      userId,
      successMessage + failureMessage,
      results.failed.length > 0 ? NotificationType.INFO : NotificationType.SUCCESS
    );

    // Store failed results in database for retrieval
    if (results.failed.length > 0) {
      await storeFailedImportResults(userId, results.failed);
    }

  } catch (error) {
    console.error("Error in background import process:", error);
    await ProcessCommand["notify all"](
      userId,
      `Player import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      NotificationType.ERROR
    );
  }
}

async function storeFailedImportResults(userId: string, failedRecords: Array<{ username: string; account: string; reason: string }>) {
  try {
    const importSessionId = `import_${Date.now()}_${userId}`;
    
    // First, remove old sessions for this user (keep only latest)
    await prisma.importFailure.deleteMany({
      where: {
        user_id: userId
      }
    });
    
    // Store failed records in database
    const failedRecordsToCreate = failedRecords.map(record => ({
      user_id: userId,
      import_session_id: importSessionId,
      username: record.username,
      account: record.account,
      reason: record.reason
    }));

    await prisma.importFailure.createMany({
      data: failedRecordsToCreate
    });

    // Failed import results stored silently
    
  } catch (error) {
    console.error("Error storing failed import results:", error);
  }
} 