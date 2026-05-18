import { getAllMetrics } from '@/lib/metrics/aggregator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();
  let metricsInterval: ReturnType<typeof setInterval>;
  let heartbeatInterval: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    async start(controller) {
      const sendMetrics = async () => {
        try {
          const data = await getAllMetrics();
          controller.enqueue(encoder.encode(`event: metrics\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to fetch metrics';
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`));
        }
      };

      const sendHeartbeat = () => {
        controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`));
      };

      // Envoi immédiat
      await sendMetrics();

      metricsInterval = setInterval(sendMetrics, 30_000);
      heartbeatInterval = setInterval(sendHeartbeat, 15_000);
    },
    cancel() {
      clearInterval(metricsInterval);
      clearInterval(heartbeatInterval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
