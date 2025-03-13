import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SessionValidation } from "@lib/sessionvalidation";

export async function GET() {
  try {
    const auth = await SessionValidation();
    
    if (!auth) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const roles = await prisma.role.findMany();
    return NextResponse.json(roles);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}
