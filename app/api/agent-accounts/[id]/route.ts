
import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import {prisma} from "@/lib/prisma";

export async function PUT(
    request: Request, 
    { params }: { params: Promise<{ id: string }> }
  ) {
    const auth = await SessionValidation();
    
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    const updatedAgentAccountData: Record<string, any> = {};
    
    if (body.username) updatedAgentAccountData.username = body.username;
    if (body.password) updatedAgentAccountData.password = body.password;
    if (body.status) updatedAgentAccountData.status = body.status;
    if (body.progress) updatedAgentAccountData.progress = body.progress;
    if (body.process_id) updatedAgentAccountData.process_id = body.process_id;
    
    const {id} = await params; 
    
    try {
      const agentAccount = await prisma.agentAccount.findUnique({
        where: { id }
      });
      
      if (!agentAccount) {
        return NextResponse.json(
          { error: "Agent account not found" },
          { status: 404 }
        );
      }
      
      await prisma.agentAccount.update({
        where: { id },
        data: updatedAgentAccountData
      });
      
      return NextResponse.json(
        {
          success: true,
          message: "Agent account updated successfully"
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error updating agent account:", error);
      
      return NextResponse.json(
        { error: "Unable to update the agent account" },
        { status: 500 }
      );
    }
  }

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { 

   const auth = await SessionValidation(); 
   
   if(!auth) {  
     return  NextResponse.json(
        {},  
        {status: 401}
    )
   }
   
   const {id} = await params; 
   try{  
        const agentAccount = await prisma.agentAccount.findFirst({  
            where: {  
                id: id
            }
        }); 

        if(!agentAccount) {  
            return NextResponse.json(
                {error: "Agent account not found"},  
                {status: 404}
            )
        } 
        
        await prisma.agentAccount.delete({where: {id:id}})

        return NextResponse.json(
            {
                success: true,
                message: "Agent account deleted successfully"
            },  
            {status:  200}
        )
   }catch(error) {  
    return NextResponse.json(
        {error: "unable to delete the agent account"},  
        {status: 500}
    )
   }

}