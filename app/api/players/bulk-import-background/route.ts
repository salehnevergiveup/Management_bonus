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
    if (players.length > 10000) {
      return NextResponse.json({ 
        error: "File too large. Maximum 10,000 records allowed per import process. Please split your file into smaller chunks." 
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
    // Debug: Check current player count in database
    const currentPlayerCount = await prisma.player.count();
    console.log(`Starting import for user ${userId}. Current players in database: ${currentPlayerCount}`);
    
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

      // Process batch - CONTINUE even if individual players fail
      for (const player of batch) {
        try {
          // Clean the username (trim whitespace and normalize case)
          const cleanUsername = player.username.trim();
          
          // Check if player already exists (case-insensitive)
          const existingPlayer = await prisma.player.findFirst({
            where: {
              account_username: cleanUsername
            }
          });

          if (existingPlayer) {
            console.log(`Player already exists: ${cleanUsername}`);
            results.failed.push({
              username: cleanUsername,
              account: player.account,
              reason: "Player already exists"
            });
            continue; // Continue to next player, don't stop the process
          }

          // Clean the account name
          const cleanAccount = player.account.trim();
          
          // Find transfer account by username
          const transferAccount = await prisma.transferAccount.findFirst({
            where: {
              username: cleanAccount,
              type: { not: "main_account" } // Exclude main accounts
            }
          });

          if (!transferAccount) {
            console.log(`Transfer account not found: ${cleanAccount}`);
            results.failed.push({
              username: cleanUsername,
              account: cleanAccount,
              reason: "Transfer account not found"
            });
            continue; // Continue to next player, don't stop the process
          }

          // Create player
          await prisma.player.create({
            data: {
              account_username: cleanUsername,
              transfer_account_id: transferAccount.id
            }
          });

          results.success++;
        } catch (error) {
          console.error("Error creating player:", error);
          results.failed.push({
            username: player.username,
            account: player.account,
            reason: "Database error"
          });
          // Continue to next player, don't stop the process
        }
      }

      // Allow other operations to proceed and reduce memory pressure
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Log progress for large imports
      if (players.length > 1000 && batchIndex % 10 === 0) {
        console.log(`Import progress for user ${userId}: ${batchIndex + 1}/${totalBatches} batches completed`);
      }
    }

    // Send final notification with summary only
    const successMessage = `Player import completed! Successfully imported ${results.success} players.`;
    const failureMessage = results.failed.length > 0 
      ? ` Failed to import ${results.failed.length} players. A dialog will appear with details.`
      : "";

    console.log(`Import completed for user ${userId}: ${results.success} successful, ${results.failed.length} failed`);
    if (results.failed.length > 0) {
      console.log("First 5 failed records:", results.failed.slice(0, 5));
    }

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

    console.log("Failed import results stored for user:", userId, "Count:", failedRecords.length, "Session:", importSessionId);
    
  } catch (error) {
    console.error("Error storing failed import results:", error);
  }
} 