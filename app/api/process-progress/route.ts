import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { prisma } from '@/lib/prisma';
import { Roles,ProcessStatus} from '@/constants/enums';

export async function GET(request: Request) {
  try {
    const auth = await SessionValidation();

    if (!auth) {
      return NextResponse.json({}, { status: 401 });
    }
    
    const process =  await prisma.userProcess.findFirst({
        where: {  
            status: {in:  [ProcessStatus.PROCESSING,  ProcessStatus.PENDING]}
        }
    })

    if(! process) {  
        return NextResponse.json(
            {
              error:  "No Active process currently"
            },  
            {
                status: 400
            }
        )
    } 

    if(auth.id !==  process.user_id || auth.role !==  Roles.Admin) {  
      return  NextResponse.json(
        {},  
        {
            status: 401
        }
      )
    } 

    const processProgress = await prisma.processProgress.findMany({
      where: {
        process_id: process.id
      },
      orderBy: {
        created_at: 'asc' // 'asc' for oldest to newest
      }
    })
    
    return NextResponse.json(processProgress, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching processes:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

