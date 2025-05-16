import { NextResponse } from "next/server"
import { SessionValidation } from "@/lib/sessionvalidation"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    console.log("Batch export API called")

    const auth = await SessionValidation()
    console.log("Auth result:", !!auth)

    if (!auth) {
      return NextResponse.json({ error: "Unauthenticated request" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
      console.log("Request body received:", {
        processIdsCount: body.processIds?.length,
        format: body.format,
        filename: body.filename,
      })
    } catch (parseError) {
      console.error("Error parsing request body:", parseError)
      return NextResponse.json({ error: "Invalid request body format" }, { status: 400 })
    }

    const { processIds, format, filename } = body

    if (!processIds || !Array.isArray(processIds) || processIds.length === 0) {
      console.error("Invalid processIds:", processIds)
      return NextResponse.json({ error: "No process IDs provided or invalid format" }, { status: 400 })
    }

    console.log(`Processing ${processIds.length} processes for ${format} export`)

    // Fetch all processes
    const processes = await prisma.userProcess.findMany({
      where: {
        id: { in: processIds },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    console.log(`Found ${processes.length} processes`)

    if (processes.length === 0) {
      return NextResponse.json({ error: "No processes found with the provided IDs" }, { status: 404 })
    }

    // Fetch all successful matches for these processes
    const matches = await prisma.match.findMany({
      where: {
        process_id: { in: processIds },
        status: "success", // Only get successful matches
      },
      include: {
        transfer_account: {
          select: {
            id: true,
            username: true,
          },
        },
        process: {
          select: {
            id: true,
            process_name: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ process_id: "asc" }, { created_at: "desc" }],
    })

    console.log(`Found ${matches.length} matches`)

    if (matches.length === 0) {
      return NextResponse.json({ error: "No successful matches found for the selected processes" }, { status: 404 })
    }

    // Format the data for export
    const exportData = matches.map((match) => ({
      "Process Name": match.process?.process_name || `Process-${match.process_id.substring(0, 8)}`,
      "Process Owner": match.process?.user?.name || "Unknown",
      Username: match.username,
      Game: match.game || "N/A",
      "Transfer Account": match.transfer_account?.username || "N/A",
      Amount: match.amount,
      Currency: match.currency,
      Status: match.status,
      "Created At": match.created_at.toISOString(),
      "Updated At": match.updated_at ? match.updated_at.toISOString() : "N/A",
    }))

    // Generate the export file
    if (format === "csv") {
      // Generate CSV
      const headers = Object.keys(exportData[0]).join(",")
      const rows = exportData.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      )
      const csv = [headers, ...rows].join("\n")

      // Return the CSV file
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename || `batch-export.csv`}"`,
        },
      })
    } else if (format === "excel") {
      // For Excel, we'll use a simple HTML table that Excel can open
      const html = `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Batch Process Export</title>
            <style>
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Batch Export - ${new Date().toLocaleString()}</h1>
            <p>Total Processes: ${processes.length}</p>
            <p>Total Matches: ${matches.length}</p>
            
            <table>
              <thead>
                <tr>
                  ${Object.keys(exportData[0])
                    .map((header) => `<th>${header}</th>`)
                    .join("")}
                </tr>
              </thead>
              <tbody>
                ${exportData
                  .map(
                    (row) => `
                  <tr>
                    ${Object.values(row)
                      .map((value) => `<td>${value}</td>`)
                      .join("")}
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </body>
        </html>
      `

      // Return the HTML file that Excel can open
      return new NextResponse(html, {
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": `attachment; filename="${filename || `batch-export.xls`}"`,
        },
      })
    } else {
      return NextResponse.json({ error: "Invalid export format" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error exporting batch data:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
