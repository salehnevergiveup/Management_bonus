import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { PrismaClient } from "@prisma/client";
import { ProcessStatus } from "@/constants/processStatus";
import crypto from 'crypto';
import { get, request } from "http";
import {Roles} from '@/constants/roles';

import { url } from "inspector";
import { User } from "@node_modules/lucide-react/dist/lucide-react";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: User must be logged in" },
        { status: 401 }
      );
    }

    const user_id = session.user.id;

    // Check for active processes
    const activeProcess = await prisma.userProcess.findFirst({
      where: {
        user_id,
        status: {
          in: [ProcessStatus.PENDING, ProcessStatus.PROCESSING]
        }
      }
    });

    if (activeProcess) {
      return NextResponse.json(
        { 
          error: "Active process already exists",
          process_id: activeProcess.id,
          status: activeProcess.status
        },
        { status: 409 } 
      );
    }

    // Generate secure identifiers
    const process_id = crypto.randomBytes(16).toString('hex');
    const token = crypto.randomBytes(32).toString('hex'); // Longer token for better security
    const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const newProcess = await prisma.$transaction(async (tx) => {
      const newProcess = await tx.userProcess.create({
        data: {
          id: process_id,
          user_id,
          status: ProcessStatus.PENDING,
          progress: 0,
        }
      });
      
      await tx.processToken.create({
        data: {
          token,
          process_id: newProcess.id,
          user_id,
          expires: expirationTime,
          isComplete: false
        }
      });
      
      return newProcess;
    });

    // Create API request to Application B
    try {
      const timestamp = Date.now().toString();
      
      // The data needed by Application B
      const requestData = {
        process_id,
        user_id
      };
      
      const signaturePayload = JSON.stringify({
        ...requestData,
        token,
        timestamp
      });
      
      const signature = crypto
        .createHmac('sha256', process.env.SHARED_SECRET || '')
        .update(signaturePayload)
        .digest('hex');

      const externalResponse = await fetch(`http://127.0.0.1:8000/api/testing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.API_KEY || '',
          'X-Token': token,
          'X-Timestamp': timestamp,
          'X-Signature': signature
        },
        body: JSON.stringify(requestData)
      });

      if (!externalResponse.ok) {
        await prisma.userProcess.update({
          where: { id: process_id },
          data: { 
            status: ProcessStatus.FAILED,
            end_time: new Date()
          }
        });
        
        const errorData = externalResponse.json();
        
        return NextResponse.json(
          { 
            error: "Failed to start process with external service",
            details: errorData,
            process_id
          },
          { status: 502 }
        );
      }

      // Process initiated successfully
      const responseData = await externalResponse.json();
      console.log(responseData);

      
      await prisma.userProcess.update({
        where: { id: process_id },
        data: { status: ProcessStatus.PROCESSING }
      });
      
      return NextResponse.json({
        success: true,
        message: "Process created and initiated successfully",
        process_id,
        status: ProcessStatus.PROCESSING,
        details: responseData
      });
    } catch (error) {
      console.error("Error communicating with external service:", error);
      
      // Update process status to failed
      await prisma.userProcess.update({
        where: { id: process_id },
        data: { 
          status: ProcessStatus.FAILED,
          end_time: new Date()
        }
      });
      
      return NextResponse.json(
        { 
          error: "Failed to connect to external service",
          process_id 
        },
        { status: 503 } 
      );
    }
  } catch (error) {
    console.error("Error creating process:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {  
  const session = await getServerSession(authOptions);  

  if(!session) {  
    return  NextResponse.json(
      {},  
      {status: 401}
    );
  }

  const auth = session?.user;  
  if(!auth) {  
    return  NextResponse.json(
      {},  
      {status: 401}
    );
  }
  try {  
    const url = new URL(request.url);
    const limit  =  parseInt(url.searchParams.get("limit") || "50");  
    const page = parseInt(url.searchParams.get("page")|| "1");  

    //calc the page 
    const skip  = (page -1) * limit;  
    const total = await prisma.notification.count();
    
    const filters =  auth.role ==  Roles.Admin?{} :  {user_id: auth.id};
    const processes  = await prisma.userProcess.findMany({
        where: filters,
        include: {
          user: true
        },
        skip,
        take: limit
      });

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    const activeProcess = await prisma.userProcess.count({where: {status: ProcessStatus.PROCESSING}});  
  
    return  NextResponse.json({
      data: processes,  
      success: true, 
      activeProcess: Boolean(activeProcess),
      pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
      message: "Process created and initiated successfully" }, {status: 200});  
  }catch(error) {  
    return NextResponse.json({ error: "Internal server error" }, {status: 500})
  }
 

} 
