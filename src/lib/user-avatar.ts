import { CHAT_AVATAR_USER } from "@/lib/chat-constants";

/** URL ảnh đại diện an toàn cho <img src> — chỉ http(s) hoặc đường dẫn tuyệt đối trên site. */
export function resolveUserAvatarSrc(
  avatarUrl: string | null | undefined,
  fallback: string = CHAT_AVATAR_USER,
): string {
  const t = avatarUrl?.trim();
  if (!t) return fallback;
  if (t.startsWith("https://") || t.startsWith("http://")) return t;
  if (t.startsWith("/") && !t.startsWith("//")) return t;
  return fallback;
}
