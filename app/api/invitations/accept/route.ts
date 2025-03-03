// app/api/invitations/accept/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { UserStatus } from '@/constants/userStatus';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { token, password, username } = await request.json();

    if (!token || !password || !username) {
      return NextResponse.json(
        { error: "Token, password and username are required" }, 
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

    // Check if username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser && existingUser.id !== invitation.user_id) {
      return NextResponse.json(
        { error: "Username is already taken" }, 
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user information
    await prisma.user.update({
      where: { id: invitation.user_id },
      data: {
        username,
        password: hashedPassword,
        status: UserStatus.ACTIVE
      }
    });

    // Mark invitation as accepted
    await prisma.userInvitation.update({
      where: { id: invitation.id },
      data: {
        accepted_at: new Date()
      }
    });

    return NextResponse.json({
      message: "Account setup completed successfully"
    });
  } catch (error: any) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to accept invitation" }, 
      { status: 500 }
    );
  }
}