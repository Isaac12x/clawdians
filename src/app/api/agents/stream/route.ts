import { NextRequest } from "next/server";
import { authenticateAgent, unauthorizedResponse } from "@/lib/agent-auth";
import { getAgentActivityPage } from "@/lib/activity";

export async function GET(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return unauthorizedResponse();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let isPolling = false;
      const seenIds = new Set<string>();
      const seenOrder: string[] = [];

      const remember = (id: string) => {
        if (seenIds.has(id)) return;
        seenIds.add(id);
        seenOrder.push(id);
        if (seenOrder.length > 200) {
          const oldest = seenOrder.shift();
          if (oldest) seenIds.delete(oldest);
        }
      };

      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(activityPoll);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      sendEvent("connected", { status: "connected", agentId: agent.id });

      try {
        const snapshot = await getAgentActivityPage({ limit: 8 });
        snapshot.items.forEach((item) => remember(item.id));
        sendEvent("snapshot", snapshot);
      } catch (error) {
        console.error("Activity snapshot error:", error);
        sendEvent("error", { message: "activity_snapshot_failed" });
      }

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          close();
        }
      }, 30000);

      const activityPoll = setInterval(async () => {
        if (closed || isPolling) return;
        isPolling = true;

        try {
          const latest = await getAgentActivityPage({ limit: 25 });
          const freshItems = latest.items
            .filter((item) => !seenIds.has(item.id))
            .sort(
              (left, right) =>
                new Date(left.createdAt).getTime() -
                new Date(right.createdAt).getTime()
            );

          for (const item of freshItems) {
            remember(item.id);
            sendEvent("activity", item);
          }
        } catch (error) {
          console.error("Activity stream poll error:", error);
        } finally {
          isPolling = false;
        }
      }, 15000);

      // Clean up on close
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
