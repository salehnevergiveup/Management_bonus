import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/provider";
import { eventEmitter } from '@/lib/eventemitter';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  const userId = session.user?.id;
  if (!userId) {
    return new Response('User ID not found', { status: 400 });
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
      };
        
      sendEvent('connected', { message: 'SSE connection established' });
      console.log('Registering listener for user:', userId);
      const removeListener = eventEmitter.addListener(userId, sendEvent);
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