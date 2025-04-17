import { NextRequest, NextResponse } from 'next/server';
import { NotificationType, ProcessStatus, Roles } from "@/constants/enums";
import { prisma } from "@/lib/prisma";
import { SessionValidation } from '@/lib/sessionvalidation';
import { preparePythonBackendHeaders } from '@/lib/apikeysHandling';
import ProcessCommand from '@lib/processCommand';

export async function POST(request: Request) {
  try {
    const auth = await SessionValidation();

    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: User must be logged in" },
        { status: 401 }
      );
    }

    const { confirmation } = await request.json();

    if (confirmation == null) {
      return NextResponse.json(
        { error: "Missing required field: confirmation" },
        { status: 400 }
      );
    }

    let userProcess = null;

    if (auth.role === Roles.Admin) {
      userProcess = await prisma.userProcess.findFirst({
        where: { status: ProcessStatus.PROCESSING },
        include: {
          user: { include: { role: true } }
        },
        orderBy: { created_at: 'desc' }
      });
    } else {
      userProcess = await prisma.userProcess.findFirst({
        where: {
          user_id: auth.id,
          status: ProcessStatus.PROCESSING
        },
        orderBy: { created_at: 'desc' }
      });
    }

    if (!userProcess) {
      return NextResponse.json(
        { error: "No active process found" },
        { status: 404 }
      );
    }

    let role = auth.role;
    if (auth.role !== Roles.Admin) {
      const user = await prisma.user.findUnique({
        where: { id: auth.id },
        include: { role: true }
      });

      if (user?.role?.name) {
        role = user.role.name;
      }
    }

    // fire and forget 
    retransferAmountRequest(userProcess.id, userProcess.user_id, role, confirmation);

    return NextResponse.json(
      {
        success: true,
        message: "Confirmation submitted successfully"
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error submitting confirmation:", error.message || error);

    return NextResponse.json(
      { error: "Server error: unable to send confirmation request" },
      { status: 500 }
    );
  }
}

async function retransferAmountRequest(
  userProcess_id: string,
  user_id: string,
  role: string,
  confirmation: boolean
) {
  try {
    const headers = await preparePythonBackendHeaders(user_id, userProcess_id, role);
    const backendUrl = `${process.env.EXTERNAL_APP_URL}retransfer-amount`;

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ confirmation })
    });

    if (!backendResponse.ok) {
      const msg = await backendResponse.text();
      throw new Error(`Backend responded with error: ${msg}`);
    }

  } catch (error: any) {
    console.error("Backend call failed:", error.message || error);
    ProcessCommand['notify all'](user_id, "Failed to retransfer amount", NotificationType.ERROR);
    throw error; 
  }
}
