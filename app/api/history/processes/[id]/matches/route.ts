import { NextResponse } from "next/server"
import { SessionValidation } from "@/lib/sessionvalidation"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request,  { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await SessionValidation()

    if (!auth) {
      return NextResponse.json({ error: "Unauthenticated request" }, { status: 401 })
    }

    const { id: processId } = await params
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status") || ""

    if (!processId) {
      return NextResponse.json({ error: "Process ID is required" }, { status: 400 })
    }

    // Check if the process exists
    const process = await prisma.userProcess.findUnique({
      where: { id: processId },
    })

    if (!process) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    // Build the where clause
    const where: any = {
      process_id: processId,
    }

    // Add status filter if provided
    if (statusFilter) {
      where.status = statusFilter
    }

    console.log("Fetching matches with where clause:", JSON.stringify(where, null, 2))

    // Fetch matches for the process
    const matches = await prisma.match.findMany({
      where,
      include: {
        transfer_account: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    })

    console.log(`Found ${matches.length} matches for process ${processId}`)

    return NextResponse.json({
      success: true,
      matches,
    })
  } catch (error) {
    console.error("Error fetching process matches:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
