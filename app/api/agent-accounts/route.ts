
import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from "@/lib/pagination";
import {GetResponse} from "@/types/get-response.type" 
import {prisma} from "@/lib/prisma";

export async function GET(request: Request) {  
    const auth = SessionValidation();  

    if(!auth) {  
        return NextResponse.json(
            { error: "Unauthorized" }, 
            {status: 401}
        )
    }
    try {  
        const countAgentAccounts = await prisma.agentAccount.count();  
        
        const paginationResult = await Pagination( 
            prisma.agentAccount,  
            new URL(request.url),  
            countAgentAccounts,  
            {}
        )

        const res: GetResponse = { 
            data: paginationResult.data, 
            pagination: paginationResult.pagination,  
            success: true, 
            message: 'data fetched successfully'
        }
        
        return NextResponse.json(res,  
            {status: 200}
        );  

    }catch(error) {  
        return NextResponse.json(
            {
                success: true,
                error: "Failed to fetch the agent accounts"
            } 
            ,{ status: 500}
        )
    }
}

export async function POST(request: Request) {  

   const auth =  await SessionValidation() ;  
   
   if(!auth) {  
    return  NextResponse.json(
        {},  
        {status: 401}
    )
   }
   
   const agentAccount  = await request.json();
   
   if(!agentAccount.username || !agentAccount.password) {  
     return  NextResponse.json(
        {error: "Messing agent account details either username or password"},  
        {status:  400} 
     ); 
   } 

   try{  
        await prisma.agentAccount.create({
            data:{  
                username:  agentAccount.username ,  
                password: agentAccount.password 
            }
        }) 
        
        return NextResponse.json(
            { 
                success: true,
                message: "Agent account created successfully"
            },  
            {status: 201}
    )
    
   }catch(error) {  
     return NextResponse.json(
        {error: "unable to create agent account"},  
        {status: 500}
     )
   }

}