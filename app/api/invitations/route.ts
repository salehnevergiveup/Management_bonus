// app/api/invitations/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { UserStatus } from '@/constants/userStatus';
import crypto from 'crypto';
import { sendInvitationEmail } from '@/lib/email';

const prisma = new PrismaClient();

// Create or resend invitation API endpoint
export async function POST(request: Request) {
  try {
    const { email, role_id, resend = false } = await request.json();
    
    // Validate input
    if (!email || !role_id) {
      return NextResponse.json(
        { error: "Email and role are required" }, 
        { status: 400 }
      );
    }

    // Find existing user by email
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        invitations: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });

    // Generate a new token and expiration date
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    let user;
    let invitation;

    if (existingUser) {
      // If we're not explicitly resending and the user is already active, return an error
      if (!resend && existingUser.status === UserStatus.ACTIVE) {
        return NextResponse.json(
          { error: "A user with this email already exists and is active" }, 
          { status: 400 }
        );
      }

      // Create a new invitation for the existing user
      invitation = await prisma.userInvitation.create({
        data: {
          token,
          user_id: existingUser.id,
          expires_at: expiresAt
        }
      });

      user = existingUser;
    } else {
      // Check if role exists
      const roleExists = await prisma.role.findUnique({
        where: { id: role_id }
      });
      
      if (!roleExists) {
        return NextResponse.json(
          { error: "Selected role does not exist" }, 
          { status: 400 }
        );
      }

      // Create user with temporary username and INACTIVE status
      const tempUsername = `user_${crypto.randomBytes(4).toString('hex')}`;
      
      // Create new user in the database with inactive status
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

      // Create invitation for the new user
      invitation = await prisma.userInvitation.create({
        data: {
          token,
          user_id: user.id,
          expires_at: expiresAt
        }
      });
    }

    // Generate invitation link
    const invitationLink = `/accept-invitation?token=${token}`;

    // Send email to the user
    try {
      await sendInvitationEmail(email, invitationLink);
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Continue anyway since the invitation was created
    }

    return NextResponse.json({
      message: resend ? "Invitation resent successfully" : "Invitation sent successfully",
      // In development, include the link for testing
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