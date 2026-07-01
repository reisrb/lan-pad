import { getText, subscribe } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Server-Sent Events: push the current text on connect, then on every change.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const enc = new TextEncoder();

  let unsubscribe: (() => void) | undefined;
  let ping: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (text: string) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ text })}\n\n`));

      send(getText(slug)); // initial state for latecomers
      unsubscribe = subscribe(slug, send);

      // keepalive comment so idle proxies/browsers don't drop the connection
      ping = setInterval(() => controller.enqueue(enc.encode(': ping\n\n')), 25000);
    },
    cancel() {
      unsubscribe?.();
      if (ping) clearInterval(ping);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
