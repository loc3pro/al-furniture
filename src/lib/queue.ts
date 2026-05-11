import { Queue } from "bullmq";
import { getRedis } from "@/lib/redis";

let orderQueue: Queue | null = null;

export function getOrderQueue() {
  if (!orderQueue) {
    orderQueue = new Queue("orders", {
      connection: getRedis(),
    });
  }
  return orderQueue;
}

export async function enqueueOrderJob(orderId: string, type: "created" | "paid" = "created") {
  try {
    const q = getOrderQueue();
    await q.add(
      "order-event",
      { orderId, type },
      { removeOnComplete: 100, attempts: 3 }
    );
  } catch (e) {
    console.warn("[queue] Redis unavailable, skip enqueue:", e);
  }
}
