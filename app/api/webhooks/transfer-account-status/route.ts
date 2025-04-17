import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApi } from "@/lib/apikeysHandling";

export async function PUT(request: Request) {
  try {

    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing API key" },
        { status: 401 }
      );
    }

    const verification = await verifyApi(request.clone(), "automation");
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || "Unauthorized request" },
        { status: 401 }
      );
    }

    const { userId, processId } = verification;

    if (!processId) {
      return NextResponse.json(
        { error: "Invalid or missing process ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { transfer_account_id, transfer_status } = body || {};

    if (!transfer_account_id || !transfer_status) {
      return NextResponse.json(
        { error: "Missing required fields: transfer_account_id or transfer_status" },
        { status: 400 }
      );
    }

    // ⚙️ Update transfer account status
    const updated = await prisma.userProcess_TransferAccount.update({
      where: {
        user_process_id_transfer_account_id: {
          user_process_id: processId,
          transfer_account_id: transfer_account_id
        }
      },
      data: {
        transfer_status
      }
    });

    return NextResponse.json(
      {
        message: "Transfer status updated successfully",
        data: updated
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Update Transfer Status Error:", error.message || error);
    return NextResponse.json(
      {
        error: "An unexpected server error occurred"
      },
      { status: 500 }
    );
  }
}
