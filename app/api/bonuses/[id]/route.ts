import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import {prisma} from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const auth = await SessionValidation();
    
    if(!auth) {
        return NextResponse.json(
            {},
            {status: 401}
        )
    }
    
    const {id} = await params;
    
    try{
        const bonus = await prisma.bonus.findFirst({
            where: {
                id: id
            }
        });
        
        if(!bonus) {
            return NextResponse.json(
                {error: "Bonus not found"},
                {status: 404}
            )
        }
        
        await prisma.bonus.delete({where: {id:id}})
        
        return NextResponse.json(
            {
                success: true,
                message: "Bonus deleted successfully"
            },
            {status: 200}
        )
    }catch(error) {
        return NextResponse.json(
            {error: "Unable to delete the bonus"},
            {status: 500}
        )
    }
}

export async function PUT(
    request: Request, 
    { params }: { params: Promise<{ id: string }> } 
  ) {  
    const auth = await SessionValidation();
  
    if (!auth) {
      return NextResponse.json(
        {},
        { status: 401 }
      );
    }
  
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Bonus ID not found."
        },
        { status: 404 }
      );
    }
  
    let body: any;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON body."
        },
        { status: 400 }
      );
    }
  
    try {
      const bonus = await prisma.bonus.findUnique({ where: { id } });
      if (!bonus) {
        return NextResponse.json(
          {
            success: false,
            error: "Bonus not found."
          },
          { status: 404 }
        );
      }
  
      const updateBonus: Record<string, any> = { updated_at: new Date() };
      if (body.name) updateBonus.name = body.name;
      if (body.function) updateBonus.function = body.function;
      if (body.description) updateBonus.description = body.description;
      if (body.baseline) updateBonus.baseline = body.baseline;
  
      await prisma.bonus.update({
        where: { id },
        data: updateBonus
      });
  
      return NextResponse.json(
        {
          success: true,
          message: "Bonus updated successfully."
        },
        { status: 200 } 
      );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to edit bonus."
        },
        { status: 500 }
      );
    }
  }
  