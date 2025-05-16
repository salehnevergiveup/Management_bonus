import { NextResponse } from "next/server"
import { SessionValidation } from "@/lib/sessionvalidation"
import { prisma } from "@/lib/prisma"

export async function DELETE(request: Request,  { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await SessionValidation()

    if (!auth) {
      return NextResponse.json({ error: "Unauthenticated request" }, { status: 401 })
    }

    const { id: processId } = await params

    if (!processId) {
      return NextResponse.json({ error: "Invalid process ID" }, { status: 400 })
    }

    // Get the current process
    const process = await prisma.userProcess.findUnique({
      where: { id: processId },
    })

    if (!process) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    // Delete related data explicitly to ensure everything is cleaned up

    // 1. Delete account turnovers
    const deletedTurnovers = await prisma.accountTurnover.deleteMany({
      where: { process_id: processId },
    })
    console.log(`Deleted ${deletedTurnovers.count} account turnovers`)

    // 2. Delete matches
    const deletedMatches = await prisma.match.deleteMany({
      where: { process_id: processId },
    })
    console.log(`Deleted ${deletedMatches.count} matches`)

    // 3. Delete process transfer accounts
    const deletedTransferAccounts = await prisma.userProcess_TransferAccount.deleteMany({
      where: { user_process_id: processId },
    })
    console.log(`Deleted ${deletedTransferAccounts.count} process transfer accounts`)

    // 4. Delete process progress logs
    const deletedProgressLogs = await prisma.processProgress.deleteMany({
      where: { process_id: processId },
    })
    console.log(`Deleted ${deletedProgressLogs.count} process progress logs`)

    // 5. Delete agent accounts
    const deletedAgentAccounts = await prisma.agentAccount.deleteMany({
      where: { process_id: processId },
    })
    console.log(`Deleted ${deletedAgentAccounts.count} agent accounts`)

    // 6. Finally delete the process itself
    const deletedProcess = await prisma.userProcess.delete({
      where: { id: processId },
    })
    console.log(`Deleted process: ${deletedProcess.id}`)

    return NextResponse.json({
      success: true,
      message: "Process and all related data deleted successfully",
      deletedData: {
        turnovers: deletedTurnovers.count,
        matches: deletedMatches.count,
        transferAccounts: deletedTransferAccounts.count,
        progressLogs: deletedProgressLogs.count,
        agentAccounts: deletedAgentAccounts.count,
      },
    })
  } catch (error) {
    console.error("Error deleting process:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
