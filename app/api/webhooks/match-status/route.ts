import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApi } from "@/lib/apikeysHandling";

export async function PUT(request: Request) {  
    try {  
        console.log("testing enpoint")
        //verify the auth 
        const apiKey = request.headers.get("X-API-Key");
        if (!apiKey) {
          return NextResponse.json(
            { error: "Missing API key" },
            { status: 401 }
          );
        }
        console.log("testing enpoint 1")
        const verification = await verifyApi(request.clone(), "automation");
        if (!verification.valid) {
          return NextResponse.json(
            { error: verification.error || "Unauthorized request" },
            { status: 401 }
          );
        }
        console.log("testing enpoint 3")
        const { userId, processId } = verification;
    
        if (!processId) {
          return NextResponse.json(
            { error: "Invalid or missing process ID" },
            { status: 400 }
          );
        }
        console.log("testing enpoint 4")
        const body = await request.json();
        const {id, status }  =  body;  
        console.log("testing enpoint 5")
        if(!id || !status) {  
         return NextResponse.json(
          { error: "Missing required fields: transfer_account_id or transfer_status" },
          {status: 400}
         )
        }

        console.log("id is: ",id);
        console.log("status is:",status);

        const update = await prisma.match.update({  
          where: {  
            id: id
          },  
          data: {  
            status: status
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