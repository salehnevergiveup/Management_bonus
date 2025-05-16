import { NextResponse } from "next/server"
import { SessionValidation } from "@/lib/sessionvalidation"
import { prisma } from "@/lib/prisma"
import { ProcessStatus } from "@/constants/enums"

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

    // Check if the process is in FAILED status
    if (process.status !== ProcessStatus.FAILED) {
      return NextResponse.json(
        {
          error: "Only processes with FAILED status can be deleted",
        },
        { status: 400 },
      )
    }

    // Delete the process
    await prisma.userProcess.delete({
      where: { id: processId },
    })

    return NextResponse.json({
      success: true,
      message: "Process deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting process:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
