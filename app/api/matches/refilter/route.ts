import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import {prisma} from "@/lib/prisma";
import ProcessCommand from '@lib/processCommand';

export async function PUT(request: Request)  {  
   try  {  
    const auth  = await SessionValidation();  

    if(!auth) {  
        return  NextResponse.json(
            {},  
            {
                status: 401
            }
        )
    }

   const body = await request.json();  

   if(!body) {  
     return NextResponse.json({

     },  
     {
        status:  401 
     } 
    )
   }

   const bonusId =  body.bonus_id;  

   if(!bonusId) {  
     return NextResponse.json(
        {error: "unable to find the bonus"},  
        {status:  400} 
     )
   }

   const bonus =  await  prisma.bonus.findUnique({where: { id:  bonusId}})
   
   if(!bonus) { 
    return NextResponse.json(
        {error: "unable to find the bonus"},  
        {status:  400} 
    )
   }
   
   refilter(auth.id, bonus);  

    return  NextResponse.json(
        {message: `refiltering users using ${bonus.name} bonus  have started `},  
        {status: 201}
    );   

    }catch(error) {  
        return NextResponse.json(
            {error},  
            {status:  400}
        )
    }
}

const refilter = async (authId: string,bonus: any) => {  
     await ProcessCommand["refilter"](authId, bonus)
}