import { SessionValidation } from "@lib/sessionvalidation";
import { NextResponse } from "next/server";
import ProcessCommand from "@lib/processCommand";

export async function PUT(request: Request){ 
 try {  
    const auth = await SessionValidation();
    if(!auth) {  
        return NextResponse.json(
            {},  
            {status: 401}
        ) 
    }
    
    //Fire and forget
    rematchPlayers(auth.id);  

    return NextResponse.json(
        {
            success: true,
            message: "Matches data is under processing now"
        },  
        {status: 202} 
    )
 }catch(error) {  
    return NextResponse.json( 
        {
            Success: false,
            error: "Unable to match the users"
        },  
        {status: 500}
    )
 }
}

async function rematchPlayers(authId: string) { 
    await ProcessCommand["rematch"](authId);
}