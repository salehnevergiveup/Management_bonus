import { NextResponse } from "next/server";
import { eventEmitter } from "@/lib/eventemitter";
import { FormType, EventOptionType } from "@/constants/eventOptionType";
import { verifyExternalRequest } from "@/lib/verifyexternalrequest";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {

    const apiKey = request.headers.get('X-API-Key'); 
    let isAuthenticated = false;
    
    if (apiKey) {
      const externalVerification = await verifyExternalRequest(request.clone());
      
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
      // Request is authenticated, proceed with business logic
      const body = await request.clone().json();
      const { user_id, options, type } = body;
      
      if (!user_id || !options || !type) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }
      
      if (!Array.isArray(options)) {
        return NextResponse.json(
          { error: "Options must be an array" },
          { status: 400 }
        );
      }
      
      // Process the request
      const validOptionTypes = Object.values(EventOptionType);
      const validOptions = options.filter(option => 
        typeof option === 'string' && 
        validOptionTypes.includes(option.toLowerCase() as EventOptionType)
      );
      
      const optionsString = validOptions.join(',');
      const formData = {
        options: optionsString,
        type: type
      };
      
      // Emit the event to notify connected clients
      eventEmitter.emit(user_id, 'forms', formData);
      
      return NextResponse.json({ 
        success: true,
        message: "Form options submitted successfully",
      });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}