import { NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { NotificationType } from "@/constants/notifications";
import { eventEmitter } from '@/lib/eventemitter';
import { verifyExternalRequest } from "@/lib/verifyexternalrequest";

const prisma = new PrismaClient(); 

export async function POST(request: Request) {
  try {

    const apiKey = request.headers.get('X-API-Key');
    let isAuthenticated = false;
    // Check if request has API key (external request)
    if (apiKey) {
      const externalVerification = await verifyExternalRequest(request.clone());
      console.log("testinmg");
        console.log(externalVerification);
      if (!externalVerification.valid) {
        return NextResponse.json(
          { error: externalVerification.error },
          { status: 401 }
        );
      }
      isAuthenticated = true;
    } 

    // Return error if not authenticated
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }
    
    // Parse request body
    const clonedRequest = request.clone();
    const body = await clonedRequest.json();
    const { userId, message, type } = body;
    
    // Validate required fields
    if (!userId || !message) {
      return NextResponse.json(
        { error: "Missing userId or message" },
        { status: 400 }
      );
    }
    
    // Validate notification type
    const validTypes = Object.values(NotificationType); 
    const notificationType =
      type && validTypes.includes(type.toLowerCase())
        ? type.toLowerCase()
        : NotificationType.INFO;
    
    // Create notification
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        message,
        type: notificationType,
      },
    });
    
    // Emit event
    eventEmitter.emit(userId, 'notification', notification);
    
    // Return success response
    return NextResponse.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error("Error processing notification request:", error);
    
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}