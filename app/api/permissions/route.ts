// Save this file at: /app/api/permissions/route.ts

import { NextResponse } from 'next/server';
import { SessionValidation } from '@/lib/sessionvalidation';
import { prisma } from "@/lib/prisma";
import { GetResponse } from '@/types/get-response.type';
import { Roles } from '@/constants/enums';

export async function GET(request: Request) {
  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  if (auth.role !== Roles.Admin) {
    return NextResponse.json(
      { error: "Unauthorized: Admin role required" },
      { status: 403 }
    );
  }

  try {
    const permissions = await prisma.permission.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    const Res: GetResponse = {
        data: permissions,
        success: true,
        message: "Permissions fetched successfully",
        pagination: null
    }
    
    return NextResponse.json(
      Res,
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}