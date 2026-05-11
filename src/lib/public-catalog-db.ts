import { prisma } from "@/lib/prisma";
import { CacheKeys, CacheTTL, redisCached } from "@/lib/redis-cache";

export async function loadActiveBannersForHome() {
  return redisCached(CacheKeys.activeBanners(), CacheTTL.activeBanners, async () =>
    prisma.banner.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
  );
}

export async function loadPublicBankAccountsForApi() {
  return redisCached(CacheKeys.bankAccounts(), CacheTTL.bankAccounts, async () =>
    prisma.bankAccount.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        bankName: true,
        accountHolder: true,
        accountNumber: true,
        branch: true,
        note: true,
      },
    }),
  );
}

export async function loadPublicRetailStoresForApi() {
  return redisCached(CacheKeys.retailStores(), CacheTTL.retailStores, async () =>
    prisma.retailStore.findMany({
      where: { active: true },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        openingHours: true,
        mapUrl: true,
        isDefault: true,
      },
    }),
  );
}
