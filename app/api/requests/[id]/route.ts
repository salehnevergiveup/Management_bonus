import { SessionValidation } from "@lib/sessionvalidation";
import { NextResponse } from "next/server";
import { Roles,NotificationType ,RequestStatus } from "@constants/enums";
import {prisma} from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await SessionValidation();
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized request" },
        { status: 401 }
      );
    }

    const requestId = params.id;
    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.request.findUnique({
      where: { id: requestId }
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    if (auth.role !== Roles.Admin) {
      return NextResponse.json(
        { error: "Only administrators can update request status" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: body.status,
        marked_admin_id: auth.id
      },
      include: {
        sender: true,
        admin: true
      }
    });

    await prisma.notification.create({
      data: {
        user_id: updatedRequest.sender_id,
        message: `Your request has been ${body.status}`,
        type: body.status === RequestStatus.ACCEPTED ? NotificationType.SUCCESS : 
              body.status === RequestStatus.REJECTED ? NotificationType.ERROR : 
              NotificationType.INFO
      }
    });

    return NextResponse.json({
      success: true,
      message: "Request updated successfully",
      data: updatedRequest
    });
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { 
        error: "Unable to update request",
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
                
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await SessionValidation();
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized request" },
        { status: 401 }
      );
    }

    const requestId = params.id;
    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    // Find the request
    const userRequest = await prisma.request.findUnique({
      where: { id: requestId }
    });

    if (!userRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    // Check permissions - only admin or the sender can delete
    const isAdmin = auth.role === Roles.Admin;
    const isSender = userRequest.sender_id === auth.id;
    
    if (!isAdmin && !isSender) {
      return NextResponse.json(
        { error: "You don't have permission to delete this request" },
        { status: 403 }
      );
    }

    // Delete the request
    await prisma.request.delete({
      where: { id: requestId }
    });

    return NextResponse.json({
      success: true,
      message: "Request deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting request:", error);
    return NextResponse.json(
      { 
        error: "Unable to delete request",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}