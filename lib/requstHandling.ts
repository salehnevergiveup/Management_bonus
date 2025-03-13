import {RequestData} from   "@/types/request-data.type" 
import { RequestOperationResult } from "@/types/request-operation-result.type";
  
  export const fetchRequests = async (
    model: string, 
    status: string
  ): Promise<Map<string, RequestData>> => {
    try {
      const response = await fetch(`/api/requests?model=${model}&status=${status}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch requests: ${response.statusText}`);
      }
      
      const apiResponse = await response.json();
      
      const requestMap = new Map<string, RequestData>();
      
      apiResponse.data.forEach((request: RequestData) => {
        const key = `${request.model_id}:${request.action}`;
        requestMap.set(key, request);
      });
      
      return requestMap;
    } catch (error) {
      console.error(`Error fetching ${model} ${status} requests:`, error);
      return new Map<string, RequestData>();
    }
  };
  
export const hasPermission = (
    permissionsMap: Map<string, any>,
    modelId: string, 
    action: string
  ): boolean => {
    let key ="";  
   if(action == "create") {  
    key = `new:${action}`;
   }else { 
      key = `${modelId}:${action}`;
   }
    return permissionsMap.has(key);
  };

  export const createRequest = async (
    model_name: string,
    modelId: string,
    action: string,
    message: string,
    authId: string
  ): Promise<RequestOperationResult> => {
    try {
      const response = await fetch(`/api/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model_name,
          model_id: modelId,
          action: action,
          sender_id: authId,
          message: message
        })
 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create request');
      }
      
      const result = await response.json();
      return { success: true, data: result.data };
    } catch (error) {
      console.error("Error creating request:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };
  
