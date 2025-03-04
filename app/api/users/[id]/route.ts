import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";


export const runtime = "nodejs";

const prisma = new PrismaClient();

export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const data = await request.json();

  try {
    if (data.role_id) {
      const roleExists = await prisma.role.findUnique({
        where: { id: data.role_id }
      });
      
      if (!roleExists) {
        return NextResponse.json(
          { error: `Role with ID ${data.role_id} does not exist` }, 
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      name: data.name,
      username: data.username,
      email: data.email,
      status: data.status,
    };

    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.role_id) updateData.role_id = data.role_id;
    if (data.profile_img !== undefined) updateData.profile_img = data.profile_img || null;
    if (data.password && data.password.trim() !== '') updateData.password = data.password;

    console.log("Updating user with data:", {
      id,
      ...updateData,
      password: updateData.password ? "[REDACTED]" : undefined
    });

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });

    return NextResponse.json({
      ...updatedUser,
      profile_img: updatedUser.profile_img || null,
    });
  } catch (error: any) {
    console.error("PUT /api/users/[id] error:", error);
    
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: "Foreign key constraint violation. Make sure the role exists." }, 
        { status: 400 }
      );
    } else if (error.code === 'P2025') {
      return NextResponse.json(
        { error: `User with ID ${id} not found` }, 
        { status: 404 }
      );
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

}

export async function DELETE(
  request: Request, 
  { params }: {  params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/users/[id] error:", error);
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: `User  not found` },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
