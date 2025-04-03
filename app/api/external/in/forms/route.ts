import { NextResponse } from "next/server";
import { eventEmitter } from "@/lib/eventemitter";
import { FormType, EventOptionType } from "@/constants/enums";
import { verifyApi } from "@/lib/apikeysHandling";

export async function POST(request: Request) {
  try {

    const apiKey = request.headers.get('X-API-Key'); 
    let isAuthenticated = false;
    let userId = null;  
    let processId = null;  
    
    if (apiKey) {
      const externalVerification = await verifyApi(request.clone(), "automation");
      
      if (!externalVerification.valid) {
        if(!externalVerification.expired)
        return NextResponse.json(
          { error: externalVerification.error },
          { status: 401 }
        );
      }
      userId = externalVerification.userId;  
      processId= externalVerification.processId
      isAuthenticated = true;
    } 
    
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }
      const body = await request.clone().json();
      const {options, type,thread_id } = body;
      
      if (!userId || !options || !type) {
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
      
      const validOptionTypes = Object.values(EventOptionType);
      const validOptions = options.filter(option => 
        typeof option === 'string' && 
        validOptionTypes.includes(option.toLowerCase() as EventOptionType)
      );
      
      console.log("this is the process ID: ",  processId);  
      const optionsString = validOptions.join(',');
      const formData = {
        options: optionsString,
        type: type,  
        thread_id: thread_id,  
        processId: processId 
      };
      
      eventEmitter.emit(userId, 'forms', formData);
      
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