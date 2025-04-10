import {ProcessCommand} from  "@/lib/processCommand"
import { SessionValidation } from "@lib/sessionvalidation";
import { NextResponse } from "next/server";
import {GenerateToken,Signature } from "@lib/apikeysHandling"
import { NotificationType, ProcessStatus } from "@constants/enums";
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, {params} : { params: Promise<{ id: string }> }){ 

 try {  
     const auth  =  await SessionValidation(); 
     
     if(!auth) {  
        return NextResponse.json(
            {message: "unauthenticated request"},  
            {status: 401}
        )
    }

    const {id:processId} = await params;  
    const body  = await request.json();  

    if(!processId) {  
        return NextResponse.json(
            {error: "Invalid process id"},  
            {status: 402}
        )
    }

    if(!body) {  
        return NextResponse.json(
            {error: "Empty request body"},  
            {status: 400}
        )
    }
    
    if(!body.matches) { 
        return NextResponse.json(
            {error: "Matches not found"}, 
            {status: 400}
        )
    }
    
    sendDataToResume(auth.id, processId, body.matches);  

    //make sure to immediately to update the process status 
    await prisma.userProcess.update({ 
        where: {id: processId}, 
        data: { 
            status: ProcessStatus.PROCESSING
        }
    });  

    return NextResponse.json(
    {
        success: true,
        message: "Process B started",
    },  
    {  
       
    }
    );
     
 }catch(error) {  
    console.error("Error creating process:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
 }

}

async function sendDataToResume(authId: string, processId: string,  matches: any[]) {  
  //async function for the notification
    const notificationFunction =  ProcessCommand["notify all"];  
    try {  
        const data =  await ProcessCommand["resume"](authId, processId, matches);  

        console.log("output data: ",  data);  

        const signaturePayload= {  
            processId,  
            authId
        }
        
        const  {token,timeStamp} = await GenerateToken(authId,  processId);  

        const signature =  Signature(signaturePayload, token, timeStamp);  
            
        const externalResponse = await fetch('add the endpoint of the other app ', {  
            method: "POST", 
            headers:  {  
                'Content-Type': 'application/json',
                'X-API-Key': process.env.API_KEY || '',
                'X-Token': token,
                'X-Timestamp': timeStamp,
                'X-Signature': signature
            },  
            body: JSON.stringify(data) 
        })

        if(!externalResponse.ok) {  
            
            await prisma.userProcess.update({
                where: { id: processId },
                data: { status: ProcessStatus.PENDING }
            });
            
            try {
                const error = await externalResponse.json();
                await notificationFunction(authId, error, NotificationType.ERROR); 
            } catch {
                await notificationFunction(authId, "Unknown error from external service", NotificationType.ERROR); 
            }
            return; 
        }
            
        await notificationFunction(authId, "Process data send successfully to automation app", NotificationType.SUCCESS); 

    }catch(error) {  
        
        await prisma.userProcess.update({
            where: { id: processId },
            data: { status: ProcessStatus.PENDING }
        });
        await notificationFunction(authId, "Unknown error from external service", NotificationType.ERROR); 
    }
}