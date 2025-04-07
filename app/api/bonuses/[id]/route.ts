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