import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  if (session.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const page = parseInt(url.searchParams.get("page") || "1");
    const status = url.searchParams.get("status") || undefined;
    const type = url.searchParams.get("type") || undefined;
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    
    const total = await prisma.notification.count({ where });
    
    const notifications = await prisma.notification.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true,
            status: true,
            profile_img: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });
    
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    
    return NextResponse.json({
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    return NextResponse.json({ 
      error: "Failed to fetch notifications" 
    }, { 
      status: 500 
    });
  }
}