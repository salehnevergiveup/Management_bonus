// app/api/notifications/[notificationId]/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { getServerSession } from "next-auth";
import { Roles } from "@/constants/roles";

const prisma = new PrismaClient();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const { notificationId } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { status } = await request.json(); 
  
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  
  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  if (notification.user_id !== session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Update the notification's status
  const updatedNotification = await prisma.notification.update({
    where: { id: notificationId },
    data: { status },
  });

  return NextResponse.json(updatedNotification);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const { notificationId } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Find the notification first to check permissions
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    
    // Check permissions: only allow users to delete their own notifications or admins to delete any
    const isAdmin = session.user?.role === Roles.Admin;
    const isOwner = notification.user_id === session.user?.id;
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    // Delete the notification
    await prisma.notification.delete({
      where: { id: notificationId },
    });
    
    return NextResponse.json({ 
      success: true,
      message: "Notification deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json({ 
      error: "Failed to delete notification" 
    }, { 
      status: 500 
    });
  }
}