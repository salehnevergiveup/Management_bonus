import { Events, NotificationType } from "@constants/enums"
import { DispatchDto } from "@/types/dispatch.type"
import {prisma} from "@/lib/prisma";
import { eventEmitter } from "./eventemitter";
import ProcessCommand from "./processCommand";
import { stat } from "fs";

const saveToDatabase =  async (dispatchData: DispatchDto) => {
  const {id} = await prisma.processProgress.create({  
    data: {  
      process_id: dispatchData.processId,  
      process_stage: dispatchData.processStage,  
      event_name: dispatchData.eventName,  
      status: dispatchData.status,  
      data: dispatchData.data,  
      thread_stage: dispatchData.threadStage,  
      thread_id: dispatchData.threadId
    }, 
    select:  {  
      id: true
    }
  }) ;  
  
  if(!id) {  
    throw new Error("Unable to save the event")
  }

  return id
};

const dispatchProgress = async (dispatchData: DispatchDto) => {
  try {
    const { threadId, processId, data, eventName } = dispatchData;

    if (!processId || !data) {
      throw new Error("Missing threadId, processId, or data for PROGRESS_TRACKER event");
    }

    if (!data.message) {
      throw new Error("PROGRESS_TRACKER event requires 'message' in data");
    }

    const id  =  await saveToDatabase(dispatchData);
    if(!id) {  
      throw new Error("message")
    }
    eventEmitter.emit(dispatchData.userId, eventName, {
      id, 
      threadId,
      processId,
      data
    });

  } catch (error) {
    throw new Error(`[dispatchProgress] ${String(error)}`);
  }
};

const dispatchConfirmation = async (dispatchData: DispatchDto) => {
  try {
    const { threadId, processId, data, eventName} = dispatchData;

    if (!threadId || !processId || !data) {
      throw new Error("Missing threadId, processId, or data for CONFIRMATION_DIALOG event");
    }

    if (!data.message) {
      throw new Error("CONFIRMATION_DIALOG event requires 'message' in data");
    }

    const id =  await saveToDatabase(dispatchData);

    eventEmitter.emit(dispatchData.userId, eventName, {
      id,
      threadId,
      processId,
      data
    });

  } catch (error) {
    throw new Error(`[dispatchConfirmation] ${String(error)}`);
  }
};

const dispatchVerificationOption = async (dispatchData: DispatchDto) => {
  try {
    const { threadId, processId, data, eventName } = dispatchData;

    if (!threadId || !processId || !data) {
      throw new Error("Missing threadId, processId, or data for VERIFICATION_METHOD event");
    }

    if (!data.message || !data.options || !data.timeout) {
      throw new Error("VERIFICATION_METHOD event requires 'message', 'options', and 'timeout' in data");
    }

    const id = await saveToDatabase(dispatchData);

    eventEmitter.emit(dispatchData.userId, eventName, {
      id,
      threadId,
      processId,
      data
    });

  } catch (error) {
    throw new Error(`[dispatchVerificationOption] ${String(error)}`);
  }
};

const dispatchVerificationCode = async (dispatchData: DispatchDto) => {
  try {
    const { threadId, processId, data, eventName } = dispatchData;

    if (!threadId || !processId || !data) {
      throw new Error("Missing threadId, processId, or data for VERIFICATION_CODE event");
    }

    if (!data.message || !data.timeout) {
      throw new Error("VERIFICATION_CODE event requires 'message' and 'timeout' in data");
    }

    const id = await saveToDatabase(dispatchData);

    eventEmitter.emit(dispatchData.userId, eventName, {
      id,
      threadId,
      processId,
      data
    });

  } catch (error) {
    throw new Error(`[dispatchVerificationCode] ${String(error)}`);
  }
};

const dispatchMatchStatus  = async(dispatchData: DispatchDto ) =>  {  
  try {  
    console.log("testing matches status event  ")
    const {status, data, eventName}  = dispatchData;

    if(!status || !data) {  
      throw new Error("Missing status or data for the matches status")
    }
    
    const id = data.id

    if(!id) {  
      throw new Error("Missing id of the account")
    }
    
    await prisma.match.update({
      where:{  
        id: id
      },  
      data:  {  
        status: status, 
        updated_at: new Date()
      }
    })
    
    eventEmitter.emit(dispatchData.userId, eventName, {  
      status,  
      id, 
      updated_at: new Date()
    });

  }catch(error) {  
    throw new Error(`[dispatchMatchStatus] ${String(error)}`)
  }
}

const dispatchTransferStatus = async (dispatchData: DispatchDto) =>  {  
   try {  
    console.log("testing transfer account status event  ")

         const { data, eventName, processId, status} = dispatchData;
     
         if (!data || !eventName || !status) {
             throw new Error("Missing required fields: data or eventName" );
         }

         const  {account, currency} = data;  

         if(!account || !currency) {  
          throw new Error("Missing required fields:  account user name or currency")
         }

         const transfer_account_id =  await prisma.transferAccount.findUnique({
             where:  {  
                 username: account
             },  
             select: { 
                 id: true
             }
          }) 
  
          if(!transfer_account_id) {  
            throw new Error ("Missing required fields: transfer_account_id or transfer_status") 
          }
          
         const updated = await prisma.userProcess_TransferAccount.update({
           where: {
             user_process_id_transfer_account_id_currency: {
               user_process_id: processId,
               transfer_account_id: transfer_account_id.id,
               currency: currency
             }
           },
           data: {
             transfer_status: status
           }
         });

  }catch(error) {  
    throw new Error(`[dispatchTransferStatus] ${String(error)}`)
  }
}

export const dispatch = async (
    processId: string,
    userId: string,
    eventName: string,
    status: string,
    processStage: string,
    data: JSON|null = null,
    threadStage: string | null = null,
    threadId: string | null = null
  ) => {
    
    const dispatchData: DispatchDto = {
      processId,
      userId,
      eventName,
      status,
      processStage,
      data,
      threadStage,
      threadId
    };

    const command = {
      [Events.VERIFICATION_OPTIONS]: async (dispatchData: any) =>await dispatchVerificationOption(dispatchData),
      [Events.VERIFICATION_CODE]: async (dispatchData: any) => await dispatchVerificationCode(dispatchData),
      [Events.CONFIRMATION_DIALOG]:async(dispatchData: any) => await dispatchConfirmation(dispatchData),
      [Events.PROGRESS_TRACKER]: async (dispatchData:any) => await dispatchProgress(dispatchData),
      [Events.MATCHES_STATUS]: async (dispatchData: any) => await dispatchMatchStatus(dispatchData),  
      [Events.TRANSFER_STATUS]: async (dispatchData: any) => await dispatchTransferStatus(dispatchData)
    };
    
    try {  
      const eventKey = dispatchData.eventName as keyof typeof command;
       
      await command[eventKey](dispatchData)

    }catch(error) {  
      console.log("=".repeat(100), eventName)
      ProcessCommand["notify all"](userId, `unable to dispatch the event: ${error}`, NotificationType.ERROR)
    }
}