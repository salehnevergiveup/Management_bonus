import { SessionValidation } from "@lib/sessionvalidation";
import { NextResponse } from "next/server";
import ProcessCommand from "@lib/processCommand";
import { prisma } from "@/lib/prisma";
import { error } from "console";

export async function PUT(request: Request, {params}: {params: Promise<{id: string}>} ) {  
  try{  

    const auth = await SessionValidation();
    
    if(!auth)  {  
      return NextResponse.json(
        {},  
        {status: 401}
      );
    }
    
    const {id}  =  await params;  

    if(!id)  { 
      return NextResponse.json(
        {error: "Unable to fetch the id "}, 
        {status: 400}
      );
    }
    
    const match = await prisma.match.findUnique({where: { id: id}});  
    
    if(!match){  
     return NextResponse.json(
      {error:  "Unable to find the match"},
      {status: 400}
     )
    }
   
    const bonus_id = match.bonus_id;  

    if(!bonus_id)  {  
      return  NextResponse.json(
        {error: "Unable to find the bonus id"},  
        {status: 400})
    }

    const bonus = await prisma.bonus.findUnique({where: {id: bonus_id}})

    if(!bonus) { 
        return NextResponse.json(
            {error: "Unable to find the bonus"},  
            {status: 400}
        )
    }

    refilterSinglePlayer(auth.id,bonus, match); 

    return NextResponse.json(
      {
        Success: true, 
        message: "matching process finished Succueffuly"
      },  
      {status: 201} 
    )
    
 }catch(error) { 
   return  NextResponse.json(
    {error: "Unable to rematch the user"} ,  
    {status: 500} 
   );
  } 
} 


async function refilterSinglePlayer(authId: string,bonus: any, match: any) { 
  await ProcessCommand["refilter player"](authId,bonus,match)
}
