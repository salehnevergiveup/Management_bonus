import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { getServerSession } from "next-auth";
import { NotificationStatus, NotificationType } from "@/constants/notifications";
import { eventEmitter } from '@/lib/eventemitter';
import { SessionValidation } from "@lib/sessionvalidation";
import { Roles } from "@constants/roles";
import { Pagination } from "@lib/pagination";

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
  export async function GET(request: Request) {
    try {
      const auth = await SessionValidation();
      
      if (!auth) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }
  
      const query: any = {
        include:  {user: true}
      };
      
      let total = 0;
      if (auth.role !== Roles.Admin) {
        query.where = { user_id: auth.id };
        total = await prisma.notification.count({ where: { id: auth.id } });
      } else {
        total = await prisma.notification.count();
      }
  
      const paginationResult = await Pagination(
        prisma.notification,
        new URL(request.url),
        total,
        query
      );
  
      return NextResponse.json(
        {
          data: paginationResult.data,
          success: true,
          message: "Notifications fetched successfully",
          pagination: {
            total: paginationResult.total,
            page: paginationResult.page,
            limit: paginationResult.limit,
            totalPages: paginationResult.totalPages,
            hasNextPage: paginationResult.hasNextPage,
            hasPreviousPage: paginationResult.hasPreviousPage,
          },
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      return NextResponse.json(
        {
          success: false,
          message: error.message || "An error occurred while fetching notifications",
        },
        { status: 500 }
      );
    }
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
