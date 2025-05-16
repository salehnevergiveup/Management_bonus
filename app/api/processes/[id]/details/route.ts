import { NextResponse } from "next/server"
import { SessionValidation } from "@/lib/sessionvalidation"
import { prisma } from "@/lib/prisma"

interface AgentAccount {
    id: string
    username: string
  }

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await SessionValidation()

    if (!auth) {
      return NextResponse.json({ error: "Unauthenticated request" }, { status: 401 })
    }

    const { id: processId } = params

    if (!processId) {
      return NextResponse.json({ error: "Invalid process ID" }, { status: 400 })
    }

    // Fetch the process with user data
    const process = await prisma.userProcess.findUnique({
      where: { id: processId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_img: true,
          },
        },
      },
    })

    if (!process) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    // Fetch connected users (agent accounts)
    const agentAccounts = await prisma.agentAccount.findMany({
      where: { process_id: processId },
      select: {
        id: true,
        username: true,
      },
    })

    // Fetch account turnovers for this process
    const accountTurnovers = await prisma.accountTurnover.findMany({
      where: { process_id: processId },
      orderBy: { createdAt: "desc" },
    })

    // Fetch matches for this process
    const matches = await prisma.match.findMany({
      where: { process_id: processId },
      orderBy: { created_at: "desc" },
    })

    // Format the response
    const formattedProcess = {
      ...process,
      connected_users: agentAccounts.map((account: AgentAccount)  => ({
        id: account.id,
        username: account.username,
      })),
      from_date: process.from_date?.toISOString(),
      to_date: process.to_date?.toISOString(),
      created_at: process.created_at.toISOString(),
      updated_at: process.updated_at.toISOString(),
    }

    return NextResponse.json({
      success: true,
      process: formattedProcess,
      accountTurnovers,
      matches,
    })
  } catch (error) {
    console.error("Error fetching process details:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
