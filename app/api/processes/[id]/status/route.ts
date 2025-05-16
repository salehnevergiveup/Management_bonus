import { NextResponse } from "next/server"
import { SessionValidation } from "@/lib/sessionvalidation"
import { prisma } from "@/lib/prisma"
import { ProcessStatus } from "@/constants/enums"

export async function PUT(request: Request,  { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await SessionValidation()

    if (!auth) {
      return NextResponse.json({ error: "Unauthenticated request" }, { status: 401 })
    }

    const { id: processId } = await params

    if (!processId) {
      return NextResponse.json({ error: "Invalid process ID" }, { status: 400 })
    }

    const body = await request.json()

    if (!body || !body.status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    const { status } = body

    // Validate the status
    if (![ProcessStatus.PENDING, ProcessStatus.ONBHOLD, ProcessStatus.FAILED].includes(status)) {
      return NextResponse.json(
        {
          error: "Invalid status. Only PENDING, ON_HOLD, or FAILED are allowed.",
        },
        { status: 400 },
      )
    }

    // Get the current process
    const currentProcess = await prisma.userProcess.findUnique({
      where: { id: processId },
    })

    if (!currentProcess) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    // Check if the status change is valid
    if (status === ProcessStatus.PENDING) {
      // Only ON_HOLD processes can be set to PENDING
      if (currentProcess.status !== ProcessStatus.ONBHOLD) {
        return NextResponse.json(
          {
            error: "Only ON_HOLD processes can be set to PENDING",
          },
          { status: 400 },
        )
      }

      // Check if there are any existing PENDING processes
      const pendingProcesses = await prisma.userProcess.findMany({
        where: {
          status: ProcessStatus.PENDING,
        },
      })

      if (pendingProcesses.length > 0) {
        return NextResponse.json(
          {
            error: "Cannot set to PENDING when other pending processes exist",
          },
          { status: 400 },
        )
      }
    } else if (status === ProcessStatus.ONBHOLD) {
      // Only PENDING processes can be set to ON_HOLD
      if (currentProcess.status !== ProcessStatus.PENDING) {
        return NextResponse.json(
          {
            error: "Only PENDING processes can be set to ON_HOLD",
          },
          { status: 400 },
        )
      }
    } else if (status === ProcessStatus.FAILED) {
      // Only ON_HOLD processes can be set to FAILED
      if (currentProcess.status !== ProcessStatus.ONBHOLD) {
        return NextResponse.json(
          {
            error: "Only ON_HOLD processes can be set to FAILED",
          },
          { status: 400 },
        )
      }
    }

    // Update the process status
    const updatedProcess = await prisma.userProcess.update({
      where: { id: processId },
      data: {
        status,
        // If marking as failed, set the end time
        ...(status === ProcessStatus.FAILED ? { end_time: new Date() } : {}),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Process status updated to ${status}`,
      data: updatedProcess,
    })
  } catch (error) {
    console.error("Error updating process status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
