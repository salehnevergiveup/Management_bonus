import { PrismaClient } from "@prisma/client";  
import {ProcessCommand} from  "@/lib/processCommand"
import { SessionValidation } from "@lib/sessionvalidation";
import { NextResponse } from "next/server";
import {GenerateToken,Signature } from "@/lib/verifyexternalrequest"
import { ProcessStatus } from "@constants/processStatus";

const prisma = new PrismaClient();

export async function POST(request: Request, {params} : {params: {id: string}}){ 
console.log("testing restart");
//  try {  
//      const auth  =  await SessionValidation(); 
     
//      if(!auth) {  
//         return NextResponse.json(
//             {message: "unauthenticated request"},  
//             {status: 401}
//         )
//     }
    
//     //set the data  
//     const processId = params.id;  
    
//     if(!processId) {  
//         return NextResponse.json(
//             {error: "Invalid process id"},  
//             {status: 402}
//         )
//     }
//     const  {token,timeStamp} = await GenerateToken(auth.id,  processId);  
    
//     const data = await  ProcessCommand["restart"](auth.id, processId);
//     const authId = auth.id;  
//     const signaturePayload= {  
//         processId,  
//         authId
//     }
     
//     const signature =  Signature(signaturePayload, token, timeStamp);  
    
//     const externalResponse = await fetch('add the endpoint of the other app ', {  
//         method: "POST", 
//         headers:  {  
//             'Content-Type': 'application/json',
//             'X-API-Key': process.env.API_KEY || '',
//             'X-Token': token,
//             'X-Timestamp': timeStamp,
//             'X-Signature': signature
//         },  
//         body: JSON.stringify(data) 
//     })

//     if(!externalResponse.ok) {  
//         let errorDetails;
//         try {
//             errorDetails = await externalResponse.json();
//         } catch {
//             errorDetails = { error: "Unknown error from external service" };
//         }
        
//         return NextResponse.json(
//             { 
//                 error: "Failed to restart process with external service",
//                 details: errorDetails,
//                 processId
//             },
//             { status: 502 }
//         );
        
//     }

//     const responseData = await externalResponse.json();
          
//     await prisma.userProcess.update({
//     where: { id: processId },
//     data: { status: ProcessStatus.PROCESSING }
//     });
          
//     return NextResponse.json({
//         success: true,
//         message: "Process created and initiated successfully",
//         processId,
//         status: ProcessStatus.PROCESSING,
//         details: responseData
//     });
     
//  }catch(error) {  
//     console.error("Error creating process:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//  }

}