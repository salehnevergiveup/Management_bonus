import { Events, ProcessProgress } from "@constants/enums";
import { dispatch } from "@lib/eventDispatcherCommand";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const userId = "4c896a76-a003-41dd-ac77-4e25a49ac67b";
    const processId = "test-process-id";
    const status = ProcessProgress.SUCCESS;
    const processStage = "initial";
    const threadStage = "stage-1";
    const threadId = "thread-1";

    // 👇 Just change this line to test different events
    const eventName = Events.VERIFICATION_OPTIONS;

    // 🔁 Automatically select the matching test data for unlimited forms
    const testDataMap: Record<string, any> = {
      [Events.VERIFICATION_OPTIONS]: {
        message: "Choose a verification method (unlimited time)",
        options: ["Email", "Mobile OTP", "SMS"]
        // No timeout = unlimited form
      },
      [Events.VERIFICATION_CODE]: {
        message: "Enter your verification code (unlimited time)"
        // No timeout = unlimited form
      },
      [Events.CONFIRMATION_DIALOG]: {
        message: "Do you confirm this operation? (unlimited time)"
        // No timeout = unlimited form
      },
      [Events.PROGRESS_TRACKER]: {
        message: "Progress updated to 60%",
        progress: 60
      }
    };

    const data = testDataMap[eventName];

    if (!data) {
      throw new Error(`No test data defined for event: ${eventName}`);
    }
   
    for(let i =1 ;  i< 4 ;  i++) {  
      await dispatch(
        processId,
        userId,
        eventName,
        status,
        processStage,
        data,
        threadStage,
        threadId + i
      );
  
    }
   
    return NextResponse.json(
      { message: `✅ Dispatched unlimited form: ${eventName}` },
      { status: 201 }
    );

  } catch (error) {
    console.error("❌ Dispatch Test Error:", error);
    return NextResponse.json(
      { error: `Server error: ${String(error)}` },
      { status: 500 }
    );
  }
} 