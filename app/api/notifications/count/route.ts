import {NextResponse } from "next/server";
import  {NotificationStatus} from "@/constants/enums"
import {SessionValidation} from "@lib/sessionvalidation";
import {prisma} from "@/lib/prisma";

export async function GET(request:  Request) {  

  const auth = await SessionValidation();
  
  if (!auth) {
    return NextResponse.json(
    { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }
   
  const notificationCount = await prisma.notification.count({
    where: {
      status: NotificationStatus.UNREAD,
      user_id: auth.id  
    },
  });

  return NextResponse.json({
      "count": notificationCount
   });
}
