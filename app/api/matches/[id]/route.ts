import { SessionValidation } from "@lib/sessionvalidation";
import { NextResponse } from "next/server";
import ProcessCommand from "@lib/processCommand";


export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    
    const auth = await SessionValidation();
    if (!auth) {
      return NextResponse.json(
        { message: "Unauthenticated request" },
        { status: 401 }
      );
    }

    const id = params.id;
    

    if (!id) {
      return NextResponse.json(
        { message: "Match ID is required" },
        { status: 400 }
      );
    }
    
    ProcessCommand["rematch user"](id, auth.id)
      .catch(err => console.error(`Background rematch process error for match ${id}:`, err));
    
    return NextResponse.json(
      { message: "Rematch process initiated in the background" },
      { status: 202 }
    );
  } catch (error) {
    console.error("Error initiating rematch process:", error);
    return NextResponse.json(
      { message: "Server error initiating the rematch process" },
      { status: 500 }
    );
  }
}