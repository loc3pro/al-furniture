import { Worker } from "bullmq";
import IORedis from "ioredis";
import { purgeExpiredChatUploads } from "../src/lib/chat-upload-cleanup";

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

async function runChatUploadCleanup() {
  try {
    const r = await purgeExpiredChatUploads();
    if (r.deleted > 0 || r.errors > 0) {
      console.log("[worker] chat upload purge:", r);
    }
  } catch (e) {
    console.error("[worker] chat upload purge failed", e);
  }
}

void runChatUploadCleanup();
setInterval(runChatUploadCleanup, 60 * 60 * 1000);

new Worker(
  "orders",
  async (job) => {
    const data = job.data as { orderId?: string; type?: string };
    console.log("[worker] order job:", job.name, data);
    /** Stub: gửi email / webhook — thay bằng Resend/SES sau */
  },
  { connection },
);

console.log(
  "[worker] listening on queue 'orders'; chat attachment cleanup every 1h — Ctrl+C to exit",
);
