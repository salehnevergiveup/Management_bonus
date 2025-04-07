import { NextResponse } from 'next/server';
import { SessionValidation } from '@lib/sessionvalidation';
import { Pagination } from "@/lib/pagination";
import {GetResponse} from "@/types/get-response.type" 
import {prisma} from "@/lib/prisma";
import BonusManagementPage from '@app/(protected)/bonuses/page';

export async function GET(request: Request) {  

  const auth = await SessionValidation(); 

  if(!auth) {  
    return NextResponse.json(
        {},  
        {status: 401}
    )
  } 

  try {  
   
    const totalBonuses =  await prisma.bonus.count();

    const paginationResult = await Pagination(
        prisma.bonus,  
        new URL(request.url),  
        totalBonuses,  
        {}
    )
   
    const res: GetResponse =  {  
        data: paginationResult.data,  
        pagination:  paginationResult.pagination, 
        success: true,  
        message: "data fetched successfully"
    }

    return NextResponse.json(
        res,  
        {status: 200}
    )

  }catch(error) {  
    return NextResponse.json(
        {error: "Unable to fetch the bonuses data"},  
        {status: 500}
    )
  }
}

export async function Post(request: Request) {
  const auth = await SessionValidation();

  if (!auth) {
    return NextResponse.json(
      {},
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: "No data received."
        },
        {
          status: 400
        }
      );
    }

    const { function: bonusFunction, description, name, baseline } = body;

    if (!bonusFunction || !description || !name || !baseline) {
      return NextResponse.json(
        {
          success: false,
          error: "Some required fields are missing. Please provide all necessary information."
        },
        {
          status: 400
        }
      );
    }

    await prisma.bonus.create({
      data: {
        function: bonusFunction,
        description,
        name,
        baseline
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: "Bonus created successfully."
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while creating the bonus."
      },
      { status: 500 }
    );
  }
}
