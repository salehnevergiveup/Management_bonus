import { NextResponse } from 'next/server';
import { SessionValidation } from '@/lib/sessionvalidation';
import { prisma } from "@/lib/prisma";
import { GetResponse } from '@/types/get-response.type';
import { Pagination } from '@/lib/pagination';
import { Roles } from '@/constants/enums';
import crypto from 'crypto';

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
    const query = {
      include: {
        APIKeyPermission: {
          include: {
            permission: true
          }
        }
      }
    };
    const total = await prisma.aPIKey.count();
    const paginationResult = await Pagination(
      prisma.aPIKey,
      new URL(request.url),
      total,
      query
    );
    
    const Res: GetResponse = {
      data: paginationResult.data,
      pagination: paginationResult.pagination,
      success: true,
      message: "API keys fetched successfully"
    }
    
    return NextResponse.json(
      Res,
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    const body = await request.json();
    
    if (!body.application) {
      return NextResponse.json(
        { error: "You have to submit the application name" },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(body.permissions)) {
      return NextResponse.json(
        { error: "Permissions must be an array of permission IDs" },
        { status: 400 }
      );
    }
    
    const findNameExist = await prisma.aPIKey.findUnique({ 
      where: { application: body.application }
    });
    
    if (findNameExist) {
      return NextResponse.json(
        { error: "This application already exists" },
        { status: 400 }
      );
    }
    
    // Verify all permission IDs exist
    if (body.permissions.length > 0) {
      const permissionCount = await prisma.permission.count({
        where: {
          id: {
            in: body.permissions
          }
        }
      });
      
      if (permissionCount !== body.permissions.length) {
        return NextResponse.json(
          { error: "One or more permission IDs are invalid" },
          { status: 400 }
        );
      }
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 90);
    
    const application = body.application;
    
    const result = await prisma.$transaction(async (tx) => {

      const newToken = await tx.aPIKey.create({
        data: {
          application,
          token,
          expires_at
        }
      });
      
      if (body.permissions.length > 0) {
        await Promise.all(
          body.permissions.map((permissionId: any) => 
            tx.aPIKeyPermission.create({
              data: {
                apikey_id: newToken.id,
                permission_id: permissionId
              }
            })
          )
        );
      }
      
      return await tx.aPIKey.findUnique({
        where: { id: newToken.id },
        include: {
          APIKeyPermission: {
            include: {
              permission: true
            }
          }
        }
      });
    });
    

    if (!result) {
      return NextResponse.json({
        success: false,
        error: "Failed to create API key"
      }, { status: 500 });
    }
    
    return NextResponse.json({
      data: result,
      success: true,
      message: "API key created successfully" 
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error generating API token:", error);
    return NextResponse.json(
      { error: "Failed to generate API token" },
      { status: 500 }
    );
  }
}
