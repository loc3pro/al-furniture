import IORedis from "ioredis";

let client: IORedis | null = null;

export function getRedis() {
  const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  if (!client) {
    client = new IORedis(url, { maxRetriesPerRequest: null });
  }
  return client;
}

/**
 * Kết nối riêng cho SUBSCRIBE (SSE badge). Không dùng `getRedis().duplicate()`:
 * sau `subscribe()` ioredis không cho gọi `INFO` (ready check) — duplicate từ singleton
 * vẫn có thể gây lỗi "Connection in subscriber mode" trong dev.
 */
export function createRedisSubscriberClient(): IORedis {
  const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
