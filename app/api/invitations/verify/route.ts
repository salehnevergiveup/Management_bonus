// app/api/invitations/verify/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" }, 
        { status: 400 }
      );
    }

    // Find invitation
    const invitation = await prisma.userInvitation.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" }, 
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (invitation.expires_at < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" }, 
        { status: 400 }
      );
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: "Invitation has already been accepted" }, 
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: invitation.user.email
    });
  } catch (error: any) {
    console.error("Error verifying invitation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify invitation" }, 
      { status: 500 }
    );
  }
}