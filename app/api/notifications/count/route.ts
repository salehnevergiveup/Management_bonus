import {PrismaClient} from  "@prisma/client";  
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { getServerSession } from "next-auth";
import  {NotificationStatus} from "@/constants/notifications"

const prisma = new PrismaClient();  

export async function GET(request:  Request) {  
   const session  = await getServerSession(authOptions); 

   if(!session) {  
    return NextResponse.json(
        {error: "Unauthorized"},  
        {status: 401}
    );  
   }

   const user  = session.user;  
   if(!user) {  
    return  NextResponse.json(
        {error: "Unauthorized"},
        {status:  401}
    )
   }
   
   const notificationCount = await prisma.notification.count({
    where: {
      status: NotificationStatus.UNREAD,
      user_id: user.id  
    },
  });

   return NextResponse.json({
      "count": notificationCount
   });
}
