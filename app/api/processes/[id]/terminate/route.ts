import { NextRequest, NextResponse } from 'next/server';
import {ProcessCommand} from  "@/lib/processCommand"
import { SessionValidation } from "@lib/sessionvalidation";
import {GenerateToken,Signature } from "@/lib/verifyexternalrequest"
import { prisma } from '@/lib/prisma';


export async function DELETE(request: Request, {params}: {params: {id: string}}) {
  try {
    const auth = await SessionValidation();
    
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized request" },
        { status: 401 }
      );
    }
    
    const authId = auth.id;
    const processId = params.id;
    
    const { token, timeStamp } = await GenerateToken(authId, processId);
    
    const signaturePayload = {
      processId,
      authId,
      action: "terminate"
    };
    
    const signature = Signature(signaturePayload, token, timeStamp);
    
    try {
      const externalResponse = await fetch(`${process.env.EXTERNAL_APP_ENDPOINT}/processes/${processId}` || '', {
        method: "DELETE",
        headers:  {  
          'Content-Type': 'application/json',
          'X-API-Key': process.env.API_KEY || '',
          'X-Token': token,
          'X-Timestamp': timeStamp,
          'X-Signature': signature
      },  
      });
      
      if (!externalResponse.ok) {
        console.warn(`External terminate request returned status ${externalResponse.status}`);
      }
    } catch (fetchError) {
      console.error("Error sending external terminate request:", fetchError);
    }
    
    ProcessCommand["terminate"](authId, processId)
      .catch(error => {
        console.error(`Error in background terminate process for ${processId}:`, error);
      });
    
    return NextResponse.json({
      success: true,
      message: "Process termination initiated",
      processId
    }, { status: 202 });
    
  } catch (error) {
    console.error("Error initiating terminate process:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}