import { NextResponse } from 'next/server';
import {prisma} from "@/lib/prisma";
import { UserStatus } from '@/constants/enums';
import crypto from 'crypto';
import { sendInvitationEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    
    const { email, role_id, resend = false } = await request.json();
    
    if (!email || !role_id) {
      return NextResponse.json(
        { error: "Email and role are required" }, 
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        invitations: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    let user;
    let invitation;

    if (existingUser) {
      if (!resend && existingUser.status === UserStatus.ACTIVE) {
        return NextResponse.json(
          { error: "A user with this email already exists and is active" }, 
          { status: 400 }
        );
      }

      invitation = await prisma.userInvitation.create({
        data: {
          token,
          user_id: existingUser.id,
          expires_at: expiresAt
        }
      });

      user = existingUser;
    } else {
      const roleExists = await prisma.role.findUnique({
        where: { id: role_id }
      });
      
      if (!roleExists) {
        return NextResponse.json(
          { error: "Selected role does not exist" }, 
          { status: 400 }
        );
      }

      const tempUsername = `user_${crypto.randomBytes(4).toString('hex')}`;
      
      user = await prisma.user.create({
        data: {
          email,
          username: tempUsername,
          name: email.split('@')[0], // Simple name based on email
          password: crypto.randomBytes(16).toString('hex'), // Random temporary password
          role_id,
          status: UserStatus.INACTIVE,
        }
      });

      invitation = await prisma.userInvitation.create({
        data: {
          token,
          user_id: user.id,
          expires_at: expiresAt
        }
      });
    }

    const invitationLink = `/accept-invitation?token=${token}`;

    try {
      await sendInvitationEmail(email, invitationLink);
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
    }

    return NextResponse.json({
      message: resend ? "Invitation resent successfully" : "Invitation sent successfully",
      ...(process.env.NODE_ENV !== 'production' && { invitationLink }),
      userId: user.id
    });
  } catch (error: any) {
    console.error("Error creating/resending invitation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process invitation" }, 
      { status: 500 }
    );
  }
}