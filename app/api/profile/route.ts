import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SessionValidation } from '@lib/sessionvalidation';
import bcrypt from "bcryptjs";


export async function GET(request: Request) {
  try {
    const auth = await SessionValidation();
    
    if (!auth) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
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


export async function PUT(request: Request) {
  try {
    const auth = await SessionValidation();
    
    if (!auth) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    
    const userId =  auth.id;   
    const data = await request.json();
    
    const user = await prisma.user.findUnique({
      where: { id:userId},
      select: { password: true }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: 404 }
      );
    }
    
    const updateData: any = {
      name: data.name,
    };
    
    if (data.profile_img !== undefined) {
      updateData.profile_img = data.profile_img;
    }
    
    if (data.newPassword && data.currentPassword) {
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
      
      updateData.password = await bcrypt.hash(data.newPassword, 10);
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { role: true },
    });
    
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