import { Events, NotificationType } from "@constants/enums"
import { DispatchDto } from "@/types/dispatch.type"
import {prisma} from "@/lib/prisma";
import { eventEmitter } from "./eventemitter";
import ProcessCommand from "./processCommand";

const saveToDatabase =  async (dispatchData: DispatchDto) => {
  console.log("saving to the database ===============================================")
  return  prisma.processProgress.create({  
    data: {  
      process_id: dispatchData.processId,  
      process_stage: dispatchData.processStage,  
      event_name: dispatchData.eventName,  
      status: dispatchData.status,  
      data: dispatchData.data,  
      thread_stage: dispatchData.threadStage,  
      thread_id: dispatchData.threadId
    }
  })   
};

const dispatchProgress = async (dispatchData: DispatchDto) => {
  try {
    const { threadId, processId, data } = dispatchData;

    if (!processId || !data) {
      throw new Error("Missing threadId, processId, or data for PROGRESS_TRACKER event");
    }

    if (!data.message) {
      throw new Error("PROGRESS_TRACKER event requires 'message' in data");
    }

    await saveToDatabase(dispatchData);
    eventEmitter.emit(dispatchData.userId, dispatchData.eventName, {
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
    const { threadId, processId, data } = dispatchData;

    if (!threadId || !processId || !data) {
      throw new Error("Missing threadId, processId, or data for CONFIRMATION_DIALOG event");
    }

    if (!data.message) {
      throw new Error("CONFIRMATION_DIALOG event requires 'message' in data");
    }

    await saveToDatabase(dispatchData);

    eventEmitter.emit(dispatchData.userId, dispatchData.eventName, {
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
    const { threadId, processId, data } = dispatchData;

    if (!threadId || !processId || !data) {
      throw new Error("Missing threadId, processId, or data for VERIFICATION_METHOD event");
    }

    if (!data.message || !data.options || !data.timeout) {
      throw new Error("VERIFICATION_METHOD event requires 'message', 'options', and 'timeout' in data");
    }

    await saveToDatabase(dispatchData);

    eventEmitter.emit(dispatchData.userId, dispatchData.eventName, {
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
    const { threadId, processId, data } = dispatchData;

    if (!threadId || !processId || !data) {
      throw new Error("Missing threadId, processId, or data for VERIFICATION_CODE event");
    }

    if (!data.message || !data.timeout) {
      throw new Error("VERIFICATION_CODE event requires 'message' and 'timeout' in data");
    }

    await saveToDatabase(dispatchData);

    eventEmitter.emit(dispatchData.userId, dispatchData.eventName, {
      threadId,
      processId,
      data
    });

  } catch (error) {
    throw new Error(`[dispatchVerificationCode] ${String(error)}`);
  }
};


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
    };
    
    try {  
      const eventKey = dispatchData.eventName as keyof typeof command;

      await command[eventKey](dispatchData)

    }catch(error) {  
      ProcessCommand["notify all"](userId, `unable to dispatch the event: ${error}`, NotificationType.ERROR)
    }
}