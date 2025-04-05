import {prisma} from "@/lib/prisma";


const TruncateSeeder =  async() => {  
    await prisma.$transaction([
      prisma.request.deleteMany(),  
      prisma.notification.deleteMany(),  
      prisma.match.deleteMany(),
      prisma.player.deleteMany(),
      prisma.transferAccount.deleteMany(),
      prisma.agentAccount.deleteMany(),
      prisma.userProcess.deleteMany(),
      prisma.aPIKeyPermission.deleteMany(),  
      prisma.aPIKey.deleteMany(),  
      prisma.userInvitation.deleteMany(),  
      prisma.user.deleteMany()  
    ])
}

export default TruncateSeeder