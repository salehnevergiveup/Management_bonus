import { NextResponse } from 'next/server';
import { SessionValidation } from '@/lib/sessionvalidation';
import { prisma } from "@/lib/prisma";
import { Roles } from '@/constants/enums';
import crypto from 'crypto';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const {id} = await params;
    const body = await request.json();
    
    const apiKey = await prisma.aPIKey.findUnique({
      where: { id },
      include: {
        APIKeyPermission: true
      }
    });
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }
    
    const updateData: any = {};
    
    if (body.application) {
      const existingApp = await prisma.aPIKey.findUnique({
        where: { application: body.application }
      });
      
      if (existingApp && existingApp.id !== id) {
        return NextResponse.json(
          { error: "This application name is already in use" },
          { status: 400 }
        );
      }
      
      updateData.application = body.application;
    }
    
    if (body.regenerateToken === true) {
      updateData.token = crypto.randomBytes(32).toString('hex');
    }
    
    if (body.extendExpiration === true) {
      const newExpiration = new Date();
      newExpiration.setDate(newExpiration.getDate() + 90);
      updateData.expires_at = newExpiration;
    }
    
    if (body.toggleRevoked === true) {
      updateData.is_revoked = !apiKey.is_revoked;
    }
    
    let permissionsUpdated = false;
    if (Array.isArray(body.permissions)) {
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
      
      permissionsUpdated = true;
    }
    
    const result = await prisma.$transaction(async (tx) => {
      const updatedApiKey = await tx.aPIKey.update({
        where: { id },
        data: updateData
      });
      
      if (permissionsUpdated) {
        await tx.aPIKeyPermission.deleteMany({
          where: { apikey_id: id }
        });
        
        if (body.permissions.length > 0) {
          await Promise.all(
            body.permissions.map((permissionId: any) => 
              tx.aPIKeyPermission.create({
                data: {
                  apikey_id: id,
                  permission_id: permissionId
                }
              })
            )
          );
        }
      }
      
      // Get the updated API key with permissions
      return await tx.aPIKey.findUnique({
        where: { id },
        include: {
          APIKeyPermission: {
            include: {
              permission: true
            }
          }
        }
      });
    });
    
    // Check if result is null before returning
    if (!result) {
      return NextResponse.json({
        success: false,
        error: "Failed to update API key"
      }, { status: 500 });
    }
    
    return NextResponse.json({
      data: result,
      success: true,
      message: "API key updated successfully"
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error updating API key:", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const {id} = await params;
    
    const apiKey = await prisma.aPIKey.findUnique({
      where: { id },
      include: {
        APIKeyPermission: {
          include: {
            permission: true
          }
        }
      }
    });
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      data: apiKey,
      success: true
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error retrieving API key:", error);
    return NextResponse.json(
      { error: "Failed to retrieve API key" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const {id} = await params;
    
    const apiKey = await prisma.aPIKey.findUnique({
      where: { id }
    });
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found" },
        { status: 404 }
      );
    }
    
    await prisma.aPIKey.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      message: "API key deleted successfully"
    }, { status: 200 });
    
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}