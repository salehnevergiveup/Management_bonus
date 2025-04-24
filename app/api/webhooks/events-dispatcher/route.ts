import { verifyApi } from "@lib/apikeysHandling";
import { dispatch } from "@lib/eventDispatcherCommand";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = request.headers.get('X-API-Key'); 
    let userId = null;
    let processId = null;

    if (apiKey) {
      const externalVerification = await verifyApi(request.clone(), "automation");
      if (!externalVerification.valid) {
        if (!externalVerification.expired) {
          return NextResponse.json(
            { error: externalVerification.error },
            { status: 401 }
          );
        }
      }
      userId = externalVerification.userId;
      processId = externalVerification.processId;
    }

    if (!userId || !processId) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { event_name, status, process_stage, thread_stage, thread_id, data } = body;

    if (!event_name || !status || !process_stage) {
      return NextResponse.json(
        { error: "Missing event_name, status or process_stage" },
        { status: 400 }
      );
    }
    await dispatch(
      processId,
      userId,
      event_name,
      status,
      process_stage,
      JSON.parse(JSON.stringify(data)), 
      thread_stage ?? null,
      thread_id ?? null
    );

    return NextResponse.json(
      { message: "Event dispatched successfully" },
      { status: 201 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: `Server error: ${error}` },
      { status: 500 }
    );
  }
}
