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

    // Process forms and handle expiration
    // Logic:
    // 1. Unlimited forms (no timeout): Show if is_active: true
    // 2. Timeout forms: Show if is_active: true AND remaining_time > 0
    // 3. Expired timeout forms: Mark as inactive and don't show
    const validForms = [];
    

    
    for (const form of processProgressForms) {
      try {
        if (!form.data || typeof form.data !== 'object') {
          continue;
        }
        
        const data = { ...(form.data as Record<string, any>) };
        
        // Check if form is already inactive
        if (data.is_active === false) {
          continue;
        }
        
        // If timeout is provided, check if it's still valid
        if (data.timeout && typeof data.timeout === 'number' && data.timeout > 0) {
          const createdAt = form.created_at instanceof Date
            ? form.created_at
            : new Date(form.created_at);
            
          if (isNaN(createdAt.getTime())) {
            continue;
          }
          
          // Use original_timeout if available, otherwise use current timeout
          const originalTimeout = data.original_timeout || data.timeout;
          const expiredDate = createdAt.getTime() + (originalTimeout * 1000);
          const currentTime = new Date().getTime();
          const remainTime = (expiredDate - currentTime) / 1000;
          

          
          if (remainTime > 0) {
            // Form is still valid, update with remaining time
            data.timeout = Math.round(remainTime);
            // Store original timeout if not already stored
            if (!data.original_timeout) {
              data.original_timeout = originalTimeout;
            }
            form.data = data;
            validForms.push(form);

          } else {
            // Form has expired, mark it as inactive in database
            await prisma.processProgress.update({
              where: { id: form.id },
              data: { 
                data: {
                  ...data,
                  is_active: false,
                  timeout: 0,
                  original_timeout: originalTimeout
                }
              }
            });
            // Don't include expired forms in response
          }
        } else {
          // No timeout or timeout is 0, form is unlimited and should be shown if active
          if (data.is_active === true) {
            validForms.push(form);
          }
        }
      } catch (error) {
        console.error(`Error processing form ${form.id}:`, error);
        continue;
      }
    }
    
    processProgressForms = validForms;



    return NextResponse.json({"forms": processProgressForms}, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching processes:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

