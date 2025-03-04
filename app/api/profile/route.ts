// app/api/profile/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Get the current user's profile
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      );
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { role: true },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}

// Update the current user's profile
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" }, 
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const data = await request.json();
    
    // Find the user to verify current password if needed
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: 404 }
      );
    }
    
    // Prepare update data object
    const updateData: any = {
      name: data.name,
    };
    
    // If profile image is provided, update it
    if (data.profile_img !== undefined) {
      updateData.profile_img = data.profile_img;
    }
    
    // If the user is trying to change their password
    if (data.newPassword && data.currentPassword) {
      // Verify current password
      const passwordMatch = await bcrypt.compare(
        data.currentPassword, 
        user.password
      );
      
      if (!passwordMatch) {
        return NextResponse.json(
          { error: "Current password is incorrect" }, 
          { status: 400 }
        );
      }
      
      // Hash the new password
      updateData.password = await bcrypt.hash(data.newPassword, 10);
    }
    
    // Update the user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { role: true },
    });
    
    // Return the updated user without the password
    const { password, ...userWithoutPassword } = updatedUser;
    
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}