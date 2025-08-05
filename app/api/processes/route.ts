import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from '@/lib/pagination';
import { GetResponse } from '@/types/get-response.type';
import { prisma } from '@/lib/prisma';
import { Roles,ProcessStatus} from '@/constants/enums';

export async function GET(request: Request) {
  try {
    const auth = await SessionValidation();

    if (!auth) {
      return NextResponse.json({}, { status: 401 });
    }

  
    const baseQuery = {
      orderBy: [
        { updated_at: 'desc' },
        { created_at: 'desc' }
      ],
      include: { user: true }
    };

    const query = auth.role === Roles.Admin
      ? { ...baseQuery }
      : { ...baseQuery, where: { user_id: auth.id } };
        const total = await prisma.userProcess.count();

    const paginationResult = await Pagination(
      prisma.userProcess,
      new URL(request.url),
      total,
      query
    );

    const activeCount = await prisma.userProcess.count({
      where: { status: ProcessStatus.PROCESSING },
    });

    const res: GetResponse = {
      data: paginationResult.data,
      pagination: paginationResult.pagination,
      success: true,
      message: "Data fetched successfully",
    };

    const responseData = {
      ...res,
      activeProcess: Boolean(activeCount),
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching processes:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

