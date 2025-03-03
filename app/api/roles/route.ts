import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const roles = await prisma.role.findMany();
    return NextResponse.json(roles);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}
