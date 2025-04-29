import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { prisma } from '@/lib/prisma';
import { Roles,ProcessStatus, Events} from '@/constants/enums';

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

    if(auth.id !==  process.user_id && auth.role !==  Roles.Admin) {  
      return  NextResponse.json(
        {},  
        {
            status: 401
        }
      )
    } 

    let processProgressForms = await prisma.processProgress.findMany({
        where: {
          process_id: process.id,
          event_name: {
            in: [Events.VERIFICATION_CODE, Events.VERIFICATION_OPTIONS, Events.CONFIRMATION_DIALOG]
          }
        }
      });

    processProgressForms = processProgressForms.filter((form) => {
        try {
          if (!form.data) {
            return false;
          }
          
          const data = { ...form.data };
          
          if (!data.timeout) {
            return false;
          }
          
          const createdAt = form.created_at instanceof Date
            ? form.created_at
            : new Date(form.created_at);
            
          if (isNaN(createdAt.getTime())) {
            return false;
          }
          
          const expiredDate = createdAt.getTime() + (data.timeout * 1000);
          const currentTime = new Date().getTime();
          const remainTime = (expiredDate - currentTime) / 1000;
          
          if (remainTime > 0) {
            data.timeout = Math.round(remainTime);
            form.data = data;
            return true;
          }
          
          return false;
        } catch (error) {
          return false;
        }
    });

    return NextResponse.json({"forms": processProgressForms}, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching processes:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

