import { getRedis } from "@/lib/redis";

const PREFIX = process.env.REDIS_CACHE_PREFIX ?? "furniture_ecm";

/** TTL (giây): hết hạn tự renew khi đọc (miss → SET EX TTL). */
export const CacheTTL = {
  theme: 300,
  homeSections: 90,
  bankAccounts: 180,
  retailStores: 180,
  /** Banner hero trang chủ */
  activeBanners: 120,
  /** Chi tiết SP (slug) — đổi khi admin PATCH SP/biến thể */
  productBySlug: 120,
} as const;

export const CacheKeys = {
  theme: () => `${PREFIX}:cache:theme:default`,
  /** Theo locale — bust cả vi + en khi đổi catalog. */
  homeSections: (locale: string) => `${PREFIX}:cache:home:sections:v3:${locale}`,
  bankAccounts: () => `${PREFIX}:cache:public:bank_accounts:v1`,
  retailStores: () => `${PREFIX}:cache:public:retail_stores:v1`,
  activeBanners: () => `${PREFIX}:cache:public:banners:active:v1`,
  productBySlug: (slug: string) =>
    `${PREFIX}:cache:product:slug:${encodeURIComponent(slug).slice(0, 400)}`,
};

/**
 * Cache Redis GET → JSON; miss thì gọi fetcher, SET EX ttlSeconds (renew TTL).
 * Redis lỗi / không có → chỉ gọi fetcher (ứng dụng vẫn chạy).
 */
export async function redisCached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
  try {
    const redis = getRedis();
    const raw = await redis.get(key);
    if (raw != null && raw.length > 0) {
      return JSON.parse(raw) as T;
    }
    const fresh = await fetcher();
    try {
      await redis.set(key, JSON.stringify(fresh), "EX", ttlSeconds);
    } catch (setErr) {
      console.warn("[redis-cache] SET failed for", key, setErr);
    }
    return fresh;
  } catch (e) {
    console.warn("[redis-cache] GET bypass:", key, e);
    return fetcher();
  }
}

export async function redisInvalidate(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    const redis = getRedis();
    await redis.del(...keys);
  } catch (e) {
    console.warn("[redis-cache] DEL failed:", keys, e);
  }
}

export async function invalidateThemeCache(): Promise<void> {
  await redisInvalidate(CacheKeys.theme());
}

export async function invalidateHomeSectionsCache(): Promise<void> {
  await redisInvalidate(CacheKeys.homeSections("vi"), CacheKeys.homeSections("en"));
}

export async function invalidateBankAccountsPublicCache(): Promise<void> {
  await redisInvalidate(CacheKeys.bankAccounts());
}

export async function invalidateRetailStoresPublicCache(): Promise<void> {
  await redisInvalidate(CacheKeys.retailStores());
}

export async function invalidateActiveBannersCache(): Promise<void> {
  await redisInvalidate(CacheKeys.activeBanners());
}

export async function invalidateProductSlugCache(slug: string): Promise<void> {
  if (!slug.trim()) return;
  await redisInvalidate(CacheKeys.productBySlug(slug));
}

/** Sau khi đổi SP ảnh hưởng trang chủ + PDP */
export async function invalidateProductAndHomeBySlug(slug: string): Promise<void> {
  await Promise.all([invalidateProductSlugCache(slug), invalidateHomeSectionsCache()]);
}
