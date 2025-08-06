import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { players } = body;

    if (!Array.isArray(players)) {
      return NextResponse.json({ error: "Invalid players data" }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: [] as Array<{ username: string; account: string; reason: string }>
    };

    // Process players in batches to avoid blocking
    const batchSize = 50;
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      
      // Process batch
      for (const player of batch) {
        try {
          // Check if player already exists
          const existingPlayer = await prisma.player.findFirst({
            where: {
              account_username: player.username
            }
          });

          if (existingPlayer) {
            results.failed.push({
              username: player.username,
              account: player.account,
              reason: "Player already exists"
            });
            continue;
          }

          // Find transfer account by username
          const transferAccount = await prisma.transferAccount.findFirst({
            where: {
              username: player.account,
              type: { not: "main_account" } // Exclude main accounts
            }
          });

          if (!transferAccount) {
            results.failed.push({
              username: player.username,
              account: player.account,
              reason: "Transfer account not found"
            });
            continue;
          }

          // Create player
          await prisma.player.create({
            data: {
              account_username: player.username,
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
        }
      }

      // Allow other operations to proceed
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in bulk import:", error);
    return NextResponse.json(
      { error: "Failed to import players" },
      { status: 500 }
    );
  }
} 