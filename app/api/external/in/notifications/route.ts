import { NextResponse } from "next/server";
import { NotificationType } from "@/constants/enums";
import { eventEmitter } from '@/lib/eventemitter';
import { verifyExternalRequest } from "@/lib/verifyexternalrequest";
import {prisma} from "@/lib/prisma";

export async function POST(request: Request) {
  try {

    const apiKey = request.headers.get('X-API-Key');
    let isAuthenticated = false;

    if (apiKey) {
      const externalVerification = await verifyExternalRequest(request.clone());
        console.log(externalVerification);
      if (!externalVerification.valid) {
        return NextResponse.json(
          { error: externalVerification.error },
          { status: 401 }
        );
      }
      isAuthenticated = true;
    } 

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }
    
    const clonedRequest = request.clone();
    const body = await clonedRequest.json();
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
    
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        message,
        type: notificationType,
      },
    });
    
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