import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { getServerSession } from "next-auth";
import { NotificationStatus, NotificationType } from "@/constants/notifications";
import { eventEmitter } from '@/lib/eventemitter';

const prisma = new PrismaClient(); 


export async function POST(request: Request) {
    const body = await request.json();
    const { userId, message, type } = body;
  
    if (!userId || !message) {
      return NextResponse.json(
        { error: "Missing userId or message" },
        { status: 400 }
      );
    }
  
    const validTypes = Object.values(NotificationType); 
    const notificationType =
      type && validTypes.includes(type.toLowerCase())
        ? type.toLowerCase()
        : NotificationType.INFO;
  
    try {
      const notification = await prisma.notification.create({
        data: {
          user_id: userId,
          message,
          type: notificationType,
        },
      });

      eventEmitter.emit(userId, 'notification', notification);
  
      return NextResponse.json(notification);
    } catch (error) {
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  }

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { user_id: session?.user?.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notifications);
}

export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.notification.updateMany({
    where: { user_id: session?.user?.id, status: NotificationStatus.UNREAD },
    data: { status: NotificationStatus.READ },
  });

  return NextResponse.json({ updatedCount: result.count });
}
