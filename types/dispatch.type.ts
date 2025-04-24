export interface DispatchDto {
    processId: string;
    userId: string;
    eventName: string;
    status: string;
    processStage: string;
    data: any;  
    threadStage: string | null;
    threadId: string | null;
  }
  