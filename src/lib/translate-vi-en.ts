import { createHash } from "node:crypto";
import { getRedis } from "@/lib/redis";

/** TTL cache Redis: 15 ngày */
export const TRANSLATE_CACHE_TTL_SEC = 1_296_000;

export type TranslateFormat = "text" | "html";

/**
 * Chuỗi duy nhất trước khi hash cache.
 * HTML: chỉ trim (giữ case thuộc tính); text: trim + lowercase.
 */
export function translateCacheMaterial(raw: string, format: TranslateFormat): string {
  const t = raw.trim();
  if (!t) return "";
  return format === "html" ? `html:${t}` : `text:${t.toLowerCase()}`;
}

export function translateRedisKey(material: string): string {
  const hash = createHash("sha256").update(material, "utf8").digest("hex");
  return `translate:vi:${hash}`;
}

/** `null` = không có trong cache (hoặc lỗi Redis → caller gọi Libre). */
export async function getCachedTranslation(material: string): Promise<string | null> {
  if (!material) return null;
  try {
    const redis = getRedis();
    const hit = await redis.get(translateRedisKey(material));
    return hit;
  } catch {
    return null;
  }
}

export async function setCachedTranslation(material: string, translated: string): Promise<void> {
  if (!material) return;
  try {
    const redis = getRedis();
    await redis.set(translateRedisKey(material), translated, "EX", TRANSLATE_CACHE_TTL_SEC);
  } catch {
    /* cache optional */
  }
}
