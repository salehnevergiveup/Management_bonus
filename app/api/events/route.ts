import { eventEmitter } from '@/lib/eventemitter';
import { SessionValidation } from '@lib/sessionvalidation';
import { NextResponse } from '@node_modules/next/server';

export async function GET(request: Request) {
   const auth = await SessionValidation();
     
     if (!auth) {
       return NextResponse.json(
         {}, 
         {status: 401}
       );
     }

  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (eventType: string, data: any) => {
        const eventString = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(eventString));
        console.log("send event call back trigged")
      };
        
      sendEvent('connected', { message: 'SSE connection established' });
      console.log('Registering listener for user:', auth.id);
      const removeListener = eventEmitter.addListener(auth.id, sendEvent);
      const intervalId = setInterval(() => {
        sendEvent('heartbeat', { time: new Date().toISOString() });
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        removeListener();
        controller.close();
      });
    }
  });

  return new Response(stream, { headers });
}