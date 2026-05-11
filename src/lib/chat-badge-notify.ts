import { getRedis } from "@/lib/redis";

/** Kênh Redis — subscriber trong SSE `/api/admin/chat/badge-events`. */
export const CHAT_BADGE_REDIS_CHANNEL = "furniture-ecm:admin-chat-badge";

/** Gọi sau tin nhắn mới / đánh dấu đã đọc — admin nhận push qua SSE. */
export function notifyAdminChatBadge(): void {
  try {
    void getRedis().publish(CHAT_BADGE_REDIS_CHANNEL, "1");
  } catch {
    /* Redis tắt — app vẫn chạy; badge có thể dựa vào poll dự phòng */
  }
}
