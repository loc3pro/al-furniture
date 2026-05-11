import { requireAdminOrSeller } from "@/lib/admin-auth";
import { CHAT_BADGE_REDIS_CHANNEL } from "@/lib/chat-badge-notify";
import { getStaffUnreadCounts, totalUnread } from "@/lib/chat-unread";
import { createRedisSubscriberClient } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events: đẩy tổng unread khi Redis publish (tin nhắn / đã đọc).
 * Không dùng Socket.IO — tránh process riêng; cần Redis (cùng BullMQ).
 */
export async function GET(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sub = createRedisSubscriberClient();
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let closed = false;

      const safeClose = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        try {
          void sub.unsubscribe(CHAT_BADGE_REDIS_CHANNEL);
        } catch {
          /* ignore */
        }
        try {
          sub.disconnect();
        } catch {
          /* ignore */
        }
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      };

      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          safeClose();
        }
      };

      try {
        const initial = await getStaffUnreadCounts();
        send({ type: "badge", total: totalUnread(initial) });

        await sub.subscribe(CHAT_BADGE_REDIS_CHANNEL);
        sub.on("message", async () => {
          try {
            const map = await getStaffUnreadCounts();
            send({ type: "badge", total: totalUnread(map) });
          } catch {
            send({ type: "badge", total: 0 });
          }
        });

        heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            safeClose();
          }
        }, 25_000);

        req.signal.addEventListener("abort", safeClose);
      } catch {
        send({ type: "error", message: "stream" });
        safeClose();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
