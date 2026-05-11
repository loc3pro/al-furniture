import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Delegate phải có trên client; nếu thiếu (sau khi thêm model + regenerate) thì tạo client mới. */
const REQUIRED_DELEGATES = [
  "chatSession",
  "chatMessage",
  "homePageConfig",
  "spinWheelConfig",
  "spinWheelSegment",
] as const;

/**
 * Bump khi schema Prisma đổi (field ChatMessage, v.v.) để không tái dùng singleton cũ sau HMR.
 * Nếu vẫn lỗi "Unknown argument", dừng `npm run dev`, chạy `npx prisma generate`, bật lại.
 */
const SCHEMA_CACHE_KEY = "2026-05-01-spin-wheel-weight-float";

type GlobalPrisma = typeof globalThis & {
  prisma?: PrismaClient;
  __prisma_schema_key__?: string;
};

/**
 * Trong dev, HMR có thể giữ PrismaClient cũ trên `globalThis` — schema runtime lệch → lỗi create/update.
 */
function getClient(): PrismaClient {
  const g = globalThis as GlobalPrisma;
  const existing = g.prisma;
  if (
    existing &&
    g.__prisma_schema_key__ === SCHEMA_CACHE_KEY &&
    REQUIRED_DELEGATES.every((k) => k in existing)
  ) {
    return existing;
  }
  if (existing) void existing.$disconnect();
  g.prisma = undefined;
  const client = createPrismaClient();
  g.__prisma_schema_key__ = SCHEMA_CACHE_KEY;
  if (process.env.NODE_ENV !== "production") g.prisma = client;
  return client;
}

export const prisma = getClient();
