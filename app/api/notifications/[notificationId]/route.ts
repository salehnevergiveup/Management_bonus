import { NextResponse } from "next/server";
import { Roles } from "@/constants/enums";
import {prisma} from "@/lib/prisma";
import { SessionValidation } from "@lib/sessionvalidation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {

  const { notificationId } = await params;

  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { status } = await request.json(); 
  
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  
  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  if (notification.user_id !== auth.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    
    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    
    const isAdmin = auth.role === Roles.Admin;
    const isOwner = notification.user_id === auth.id;
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
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