import { NextResponse } from "next/server";
import { SessionValidation } from "@lib/sessionvalidation";
import {prisma} from "@/lib/prisma";

export async function GET() {
  const auth = await SessionValidation();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { user_id: auth.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notifications);
}
