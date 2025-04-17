import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApi } from "@/lib/apikeysHandling";

export async function PUT(request: Request) {  
    try {  
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
    
        const body = await request.json();
        const {match_id, match_status }  =  body;  

        if(!match_id || !match_status) {  
         return NextResponse.json(
          { error: "Missing required fields: transfer_account_id or transfer_status" },
          {status: 400}
         )
        }

        const update =  prisma.match.update({  
          where: {  
            id: match_id
          },  
          data: {  
            status: match_status
          }
        })

        return NextResponse.json(
          {message: "Match status updated successfully",},  
          {status: 201}
        )
    
    }catch(error) {  
        
        console.log("something went wrong: ", error); 

        return NextResponse.json(
            {
                error: "Server side error, unable to update the player status "
            },  
            {
                status: 500
            }
        )
    }
}