import { NextResponse } from 'next/server';
import {ProcessCommand} from  "@/lib/processCommand"
import { SessionValidation } from "@lib/sessionvalidation";
import { prisma } from '@/lib/prisma';
import { ProcessStatus } from '@constants/enums';


export async function DELETE(request: Request, {params}: { params: Promise<{ id: string }> }) {
  try { 
   const auth =  await SessionValidation();

   if(!auth) {  
      return NextResponse.json(
      {},  
      {status: 401}
     )
   }

   const {id} = await params; 
   
   if(!id) {  
    return NextResponse.json(
      {
        error: "Unable to find the process"
      }, 
      {status: 404}
    )
   }

   const process = await prisma.userProcess.findFirst({
    where: {
      id,
      status: {
        notIn: [ProcessStatus.COMPLETED, ProcessStatus.FAILED]
      }
    }
  });

  if(!process) {  
    return NextResponse.json(
      {
        error: "Unable to find the process"
      }, 
      {status: 404}
    )
  }
  
  //Fire & Forget
  terminateProcess(auth.id,  id); 

  return NextResponse.json(
    {
      Success: true,
      message: "start to terminate the process"
    }, 
    {status: 202}
  )
  
  }catch(error) { 
    console.log(error); 
    return NextResponse.json(
      {error: "unable to stop the process"},  
      {status: 500}
    )
  }
}

async function terminateProcess(authId: string,  processId: string){  
   await ProcessCommand["terminate"](authId, processId);  
}