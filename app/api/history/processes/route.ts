import { NextResponse } from "next/server"
import { SessionValidation } from "@/lib/sessionvalidation"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const auth = await SessionValidation()

    if (!auth) {
      return NextResponse.json({ error: "Unauthenticated request" }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status") || ""
    const search = searchParams.get("search") || ""

    // Calculate pagination
    const skip = (page - 1) * limit

    // First, let's check what status values actually exist in the database
    const distinctStatuses = await prisma.userProcess.findMany({
      select: {
        status: true,
      },
      distinct: ["status"],
    })


    // Build the where clause - IMPORTANT: We're not filtering by status initially
    // to see what data is actually in the database
    let where: any = {}

    // Add search filter if provided
    if (search) {
      where = {
        OR: [
          { process_name: { contains: search } },
          { id: { contains: search } },
          { user: { name: { contains: search } } },
          { user: { email: { contains: search } } },
        ],
      }
    }

    // Count total records for pagination without status filter
    const totalWithoutStatusFilter = await prisma.userProcess.count({ where })

    // Fetch a sample of processes to see what's in the database
    const sampleProcesses = await prisma.userProcess.findMany({
      take: 5,
      orderBy: {
        updated_at: "desc",
      },
      select: {
        id: true,
        status: true,
        process_name: true,
      },
    })

    // Now let's try to filter by status
    // We'll try both uppercase and lowercase versions of common status values
    const possibleStatusValues = [
      "failed",
      "FAILED",
      "Failed",
      "success",
      "SUCCESS",
      "Success",
      "completed",
      "COMPLETED",
      "Completed",
    ]

    // If a specific status is requested, use that
    if (status && status !== "all") {
      // Try both the exact status and lowercase/uppercase versions
      where = {
        ...where,
        OR: [
          { status: status },
          { status: status.toLowerCase() },
          { status: status.toUpperCase() },
          { status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() }, // Capitalized
        ],
      }
    } else {
      // If no specific status, try to find any completed or failed processes
      where = {
        ...where,
        OR: possibleStatusValues.map((s) => ({ status: s })),
      }
    }

    // Count total records for pagination with status filter
    const total = await prisma.userProcess.count({ where })

    // Fetch processes with user data
    const processes = await prisma.userProcess.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profile_img: true,
          },
        },
        _count: {
          select: {
            matches: true,
          },
        },
      },
      orderBy: {
        updated_at: "desc",
      },
      skip,
      take: limit,
    })

    if (processes.length > 0) {
      console.log("Sample process:", {
        id: processes[0].id,
        status: processes[0].status,
        process_name: processes[0].process_name,
      })
    }

    // Get success match counts for each process
    const processIds = processes.map((p) => p.id)

    // Check what status values exist for matches
    const matchStatuses = await prisma.match.findMany({
      select: {
        status: true,
      },
      distinct: ["status"],
    })

    // Try to find success matches with various possible status values
    const possibleMatchStatusValues = ["success", "SUCCESS", "Success"]

    const successMatchCounts = await prisma.match.groupBy({
      by: ["process_id"],
      where: {
        process_id: { in: processIds },
        OR: possibleMatchStatusValues.map((s) => ({ status: s })),
      },
      _count: {
        id: true,
      },
    })

    // Create a map of process_id to success match count
    const successMatchCountMap = new Map()
    successMatchCounts.forEach((item) => {
      successMatchCountMap.set(item.process_id, item._count.id)
    })

    // Format the response
    const formattedProcesses = processes.map((process) => ({
      ...process,
      from_date: process.from_date?.toISOString(),
      to_date: process.to_date?.toISOString(),
      created_at: process.created_at.toISOString(),
      updated_at: process.updated_at.toISOString(),
      matchCount: process._count.matches,
      successMatchCount: successMatchCountMap.get(process.id) || 0,
    }))

    // Calculate pagination details
    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      success: true,
      data: formattedProcesses,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
      debug: {
        availableStatuses: distinctStatuses.map((s) => s.status),
        availableMatchStatuses: matchStatuses.map((s) => s.status),
        totalWithoutFilter: totalWithoutStatusFilter,
        totalWithFilter: total,
      },
    })
  } catch (error) {
    console.error("Error fetching historical processes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
