import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { verifyApi } from "@/lib/apikeysHandling";
import { eventEmitter } from '@lib/eventemitter';

export async function PUT(request: Request) {  
    try{
        //verify the auth 
        const apiKey = request.headers.get("X-API-Key");
        if (!apiKey) {
            return NextResponse.json(
            { error: "Missing API key" },
            { status: 401 }
            );
        }
    
        const verification = await verifyApi(request.clone(), "automation");
        if (!verification.valid) {
            return NextResponse.json(
            { error: verification.error || "Unauthorized request" },
            { status: 401 }
            );
        }
    
        const { userId, processId } = verification;
    
        if (!processId) {
            return NextResponse.json(
            { error: "Invalid or missing process ID" },
            { status: 400 }
            );
        }

        const body =  await request.json();  

        if(!body.message ||  !body.title){ 
          return  NextResponse.json(
            {error:  "Missing required fields: message or title"},  
            {status: 400}  
          )
        }

        eventEmitter.emit(userId, 'show_details', body);

        return NextResponse.json({ 
          message: "Form options submitted successfully",
        },
        { status:200 }
    );
    }catch(error) {  
       
        return  NextResponse.json(
            {
               error: "Unable to create transfer accounts"
            }, 
            {status: 200}
        )
    }

}