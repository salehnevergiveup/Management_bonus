import { NextResponse } from 'next/server';
import {prisma} from "@/lib/prisma";
import { UserStatus } from '@/constants/enums';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { token, password, username } = await request.json();

    if (!token || !password || !username) {
      return NextResponse.json(
        { error: "Token, password and username are required" }, 
        { status: 400 }
      );
    }

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

    if (invitation.expires_at < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" }, 
        { status: 400 }
      );
    }

    if (invitation.accepted_at) {
      return NextResponse.json(
        { error: "Invitation has already been accepted" }, 
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser && existingUser.id !== invitation.user_id) {
      return NextResponse.json(
        { error: "Username is already taken" }, 
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: invitation.user_id },
      data: {
        username,
        password: hashedPassword,
        status: UserStatus.ACTIVE
      }
    });

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