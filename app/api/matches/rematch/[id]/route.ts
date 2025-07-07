import { SessionValidation } from "@lib/sessionvalidation";
import { NextResponse } from "next/server";
import ProcessCommand from "@lib/processCommand";
import { prisma } from "@/lib/prisma";

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
      {status: 404}
     )
    }
  
    await rematchSinglePlayer(auth.id, match.id); 

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


async function rematchSinglePlayer(authId: string, matchId: string) { 
  await ProcessCommand["rematch player"](authId,  matchId )
}


