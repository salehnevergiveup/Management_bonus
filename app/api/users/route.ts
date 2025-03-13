import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from "@/lib/pagination";
import { GetResponse } from "@/types/get-response.type";
import { prisma } from "@/lib/prisma";
import { Roles } from "@/constants/enums";

export async function GET(request: Request) {
  try {
    const auth = await SessionValidation();

    if (!auth || auth.role !== Roles.Admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const total = await prisma.user.count();

    const query = {
      include: {
        role: true,
      },
    };

    const paginationResult = await Pagination(
      prisma.user,
      new URL(request.url),
      total,
      query
    );

    const res: GetResponse = {
      data: paginationResult.data,
      pagination: paginationResult.pagination,
      success: true,
      message: "Data fetched successfully",
    };

    return NextResponse.json(res, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}
