import { SessionValidation } from "@lib/sessionvalidation";
import { NextResponse } from "next/server";
import { Roles,RequestStatus } from "@constants/enums";
import { Pagination } from "@/lib/pagination";
import {GetResponse} from "@/types/get-response.type" 
import {prisma} from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const auth = await SessionValidation();
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthenticated request" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    
    const model = url.searchParams.get('model');
    const status = url.searchParams.get('status');

    const query: any = {
      include: {
        sender: true,
        admin: true
      }
    };

    query.where = {};
    if (auth.role !== Roles.Admin) {
      query.where.sender_id = auth.id;
    }

    if (model) {
      query.where.model_name = model;
    }
    
    if (status) {
      query.where.status = status;
    }

    const total = await prisma.request.count({ 
      where: query.where 
    });
    
    const paginationResult = await Pagination(
      prisma.request,
      url,
      total,
      query
    );

    const Res : GetResponse = { 
      data: paginationResult.data,  
      pagination:  paginationResult.pagination, 
      success: true,  
      message: "data fetched successfully"
    }

    return NextResponse.json(
      Res,
      { status: 200 });

  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { error: "Server error, failed to fetch requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {  
  try {  
      const auth = await SessionValidation(); 
  
      if (!auth) {  
          return NextResponse.json(
              {error: "Unauthenticated request"},  
              {status: 401}
          );
      }

      const userRequest = await request.json(); 

      if (!userRequest.model_name ||  
          !userRequest.message || 
          !userRequest.action
      ) {  
          return NextResponse.json(
              {error: "Bad request: missing message, model name, or action"}, 
              {status: 400} 
          );
      }

      const modelId = userRequest.action === 'create' ? 'new' : userRequest.model_id;
      
      if (!modelId) {
          return NextResponse.json(
              {error: "Model ID is required for non-create actions"}, 
              {status: 400}
          );
      }

      const existingRequest = await prisma.request.findFirst({
          where: {
              sender_id: auth.id,
              model_name: userRequest.model_name,
              model_id: modelId,
              action: userRequest.action,
              status: {
                  in: [RequestStatus.PENDING, RequestStatus.ACCEPTED]
              }
          },
          orderBy: {
              created_at: 'desc' 
          }
      });

      const recentRejectedRequest = await prisma.request.findFirst({
          where: {
              sender_id: auth.id,
              model_name: userRequest.model_name,
              model_id: modelId,
              action: userRequest.action,
              status: RequestStatus.REJECTED
          },
          orderBy: {
              created_at: 'desc'
          }
      });

      if (existingRequest) {
          const statusMessage = existingRequest.status === RequestStatus.PENDING 
              ? "You already have a pending request for this action." 
              : "You already have an approved request for this action.";
              
          return NextResponse.json(
              {
                  error: "Duplicate request",
                  message: statusMessage,
                  existingRequest: existingRequest
              }, 
              {status: 409} 
          );
      }
      
      let warningMessage = null;
      if (recentRejectedRequest) {
          // Calculate time since rejection (in hours)
          const rejectionTime = new Date(recentRejectedRequest.updated_at);
          const hoursSinceRejection = (Date.now() - rejectionTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceRejection < 24) {
              warningMessage = "Note: A similar request was recently rejected.";
          }
      }

      const newRequest = await prisma.request.create({
          data: {  
              sender_id: auth.id,  
              message: userRequest.message,  
              model_name: userRequest.model_name, 
              model_id: modelId,  
              action: userRequest.action,
              status: RequestStatus.PENDING
          }
      });  
      
      console.log(newRequest);
      
      return NextResponse.json({
          data: newRequest,
          success: true,
          message: "Request created successfully",
          warning: warningMessage
      }, 
      { status: 201 });  

  } catch (error) {  
      console.error("Error creating request:", error);
      return NextResponse.json(
        { error: "Server error, failed to create request"},  
        { status: 500 }
      );
  }
}