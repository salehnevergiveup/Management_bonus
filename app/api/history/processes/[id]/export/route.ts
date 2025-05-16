import { NextResponse } from "next/server"
import { SessionValidation } from "@/lib/sessionvalidation"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await SessionValidation()

    if (!auth) {
      return NextResponse.json({ error: "Unauthenticated request" }, { status: 401 })
    }

    const processId = params.id
    const { format, filename } = await request.json()

    // Verify the process exists
    const process = await prisma.userProcess.findFirst({
      where: {
        id: processId,
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

    if (!process) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    // Fetch successful matches for the process with related data
    const matches = await prisma.match.findMany({
      where: {
        process_id: processId,
        status: "success", // Only get successful matches
      },
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

    if (matches.length === 0) {
      return NextResponse.json({ error: "No successful matches found for export" }, { status: 404 })
    }

    // Format the data for export
    const exportData = matches.map((match) => ({
      Username: match.username,
      Game: match.game || "N/A",
      "Transfer Account": match.transfer_account?.username || "N/A",
      Amount: match.amount,
      Currency: match.currency,
      Status: match.status,
      "Created At": match.created_at.toISOString(),
      "Process Name": process.process_name || `Process-${process.id.substring(0, 8)}`,
      "Process Owner": process.user?.name || "Unknown",
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
          "Content-Disposition": `attachment; filename="${filename || `process-${processId}-export.csv`}"`,
        },
      })
    } else if (format === "excel") {
      // For Excel, we'll use a simple HTML table that Excel can open
      const html = `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Process Export</title>
          </head>
          <body>
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
          "Content-Disposition": `attachment; filename="${filename || `process-${processId}-export.xls`}"`,
        },
      })
    } else {
      return NextResponse.json({ error: "Invalid export format" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error exporting process data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
