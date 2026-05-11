import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { invalidateHomeSectionsCache } from "@/lib/redis-cache";
import { resolveListMode } from "@/lib/homepage-list-mode";
import { DEFAULT_HOME_PAGE_CONFIG } from "@/lib/home-defaults";
import { normalizeHomeSectionBlockOrder } from "@/lib/homepage-section-order";

/** Danh mục fallback cho section “Sản phẩm nổi bật” — không nhận từ client. */
const AUTO_LIVING_CATEGORY_SLUG = "phong-khach";

function parseIds(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function sortByIds<T extends { id: string }>(items: T[], order: string[]): T[] {
  const map = new Map(items.map((i) => [i.id, i]));
  return order.map((id) => map.get(id)).filter((x): x is T => x != null);
}

/** Row từ Prisma — merge với DEFAULTS khi null / lỗi tải. */
type HomePageConfigRow = {
  featuredTitle?: string | null;
  featuredProductsMode?: string | null;
  featuredSectionEnabled?: boolean | null;
  featuredProductIds?: unknown;
  newSectionTitle?: string | null;
  newProductsMode?: string | null;
  newSectionEnabled?: boolean | null;
  newProductIds?: unknown;
  newProductsLimit?: number | null;
  livingSectionTitle?: string | null;
  livingCategorySlug?: string | null;
  livingProductsMode?: string | null;
  livingSectionEnabled?: boolean | null;
  livingProductIds?: unknown;
  livingLimit?: number | null;
  newsSectionTitle?: string | null;
  newsMode?: string | null;
  newsSectionEnabled?: boolean | null;
  newsPostIds?: unknown;
  newsLimit?: number | null;
  shopLookSectionEnabled?: boolean | null;
  shopLookTitle?: string | null;
  shopLookSubtitle?: string | null;
  shopLookMode?: string | null;
  shopLookCardLimit?: number | null;
  shopLookOrderIds?: unknown;
  sectionBlockOrder?: unknown;
};

function asConfigRow(row: unknown): HomePageConfigRow | null {
  if (row != null && typeof row === "object") return row as HomePageConfigRow;
  return null;
}

const patchBody = z.object({
  featuredTitle: z.string().min(1).max(200).optional(),
  featuredProductsMode: z.enum(["AUTO", "CUSTOM"]).optional(),
  featuredSectionEnabled: z.boolean().optional(),
  featuredProductIds: z.array(z.string()).optional(),
  newSectionTitle: z.string().min(1).max(200).optional(),
  newProductsMode: z.enum(["AUTO", "CUSTOM"]).optional(),
  newSectionEnabled: z.boolean().optional(),
  newProductIds: z.array(z.string()).optional(),
  newProductsLimit: z.number().int().min(1).max(48).optional(),
  livingSectionTitle: z.string().min(1).max(200).optional(),
  livingProductsMode: z.enum(["AUTO", "CUSTOM"]).optional(),
  livingSectionEnabled: z.boolean().optional(),
  livingProductIds: z.array(z.string()).optional(),
  livingLimit: z.number().int().min(1).max(48).optional(),
  newsSectionTitle: z.string().min(1).max(200).optional(),
  newsMode: z.enum(["AUTO", "CUSTOM"]).optional(),
  newsSectionEnabled: z.boolean().optional(),
  newsPostIds: z.array(z.string()).optional(),
  newsLimit: z.number().int().min(1).max(24).optional(),
  shopLookSectionEnabled: z.boolean().optional(),
  shopLookTitle: z.string().min(1).max(200).optional(),
  shopLookSubtitle: z.string().max(3000).optional(),
  shopLookMode: z.enum(["AUTO", "CUSTOM"]).optional(),
  shopLookCardLimit: z.number().int().min(1).max(12).optional(),
  shopLookOrderIds: z.array(z.string()).optional(),
  sectionBlockOrder: z
    .array(z.enum(["FEATURED", "SHOP_LOOK", "NEW_PRODUCTS", "LIVING", "NEWS"]))
    .optional(),
});

const DEFAULTS = {
  featuredTitle: "Bộ sưu tập nổi bật",
  featuredProductsMode: "AUTO" as const,
  featuredSectionEnabled: true,
  featuredProductIds: [] as string[],
  newSectionTitle: "Sản phẩm mới",
  newProductsMode: "AUTO",
  newSectionEnabled: true,
  newProductIds: [] as string[],
  newProductsLimit: 12,
  livingSectionTitle: "Sản phẩm nổi bật",
  livingProductsMode: "AUTO" as const,
  livingSectionEnabled: true,
  livingProductIds: [] as string[],
  livingLimit: 8,
  newsSectionTitle: "Tin tức",
  newsMode: "AUTO",
  newsSectionEnabled: true,
  newsPostIds: [] as string[],
  newsLimit: 3,
  shopLookSectionEnabled: DEFAULT_HOME_PAGE_CONFIG.shopLookSectionEnabled,
  shopLookTitle: DEFAULT_HOME_PAGE_CONFIG.shopLookTitle,
  shopLookSubtitle: DEFAULT_HOME_PAGE_CONFIG.shopLookSubtitle,
  shopLookMode: "AUTO" as const,
  shopLookCardLimit: DEFAULT_HOME_PAGE_CONFIG.shopLookCardLimit,
  shopLookOrderIds: [] as string[],
};

export async function GET() {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  /** Phải try/catch: nếu client Prisma cũ thiếu `homePageConfig`, `.findUnique` lỗi đồng bộ (không vào `.catch()` của Promise). */
  let row: HomePageConfigRow | null = null;
  let loadWarning: string | undefined;
  try {
    const rowRaw = await prisma.homePageConfig.findUnique({ where: { id: "default" } }).catch(() => null);
    row = asConfigRow(rowRaw);
  } catch (e) {
    console.error("[api/admin/homepage GET]", e);
    loadWarning =
      "Không đọc được HomePageConfig (chạy `npx prisma generate`, xóa `.next`, khởi động lại `npm run dev`, và migrate DB nếu cần).";
    row = null;
  }

  const fIds = parseIds(row?.featuredProductIds ?? []);
  const nIds = parseIds(row?.newProductIds ?? []);
  const lIds = parseIds(row?.livingProductIds ?? []);
  const pIds = parseIds(row?.newsPostIds ?? []);
  const slIds = parseIds(row?.shopLookOrderIds ?? []);

  const [fp, np, lp, bp, slLooks] = await Promise.all([
    fIds.length
      ? prisma.product.findMany({
          where: { id: { in: fIds } },
          select: { id: true, nameVi: true, slug: true },
        })
      : [],
    nIds.length
      ? prisma.product.findMany({
          where: { id: { in: nIds } },
          select: { id: true, nameVi: true, slug: true },
        })
      : [],
    lIds.length
      ? prisma.product.findMany({
          where: { id: { in: lIds } },
          select: { id: true, nameVi: true, slug: true },
        })
      : [],
    pIds.length
      ? prisma.blogPost.findMany({
          where: { id: { in: pIds } },
          select: { id: true, title: true, slug: true },
        })
      : [],
    slIds.length
      ? prisma.shopTheLook.findMany({
          where: { id: { in: slIds } },
          select: { id: true, title: true, slug: true },
        })
      : [],
  ]);

  return NextResponse.json({
    ...(loadWarning ? { warning: loadWarning } : {}),
    config: {
      featuredTitle: row?.featuredTitle ?? DEFAULTS.featuredTitle,
      featuredProductsMode: resolveListMode(row?.featuredProductsMode, fIds.length > 0),
      featuredSectionEnabled: row?.featuredSectionEnabled ?? DEFAULTS.featuredSectionEnabled,
      featuredProductIds: fIds,
      newSectionTitle: row?.newSectionTitle ?? DEFAULTS.newSectionTitle,
      newProductsMode: row?.newProductsMode === "CUSTOM" ? "CUSTOM" : "AUTO",
      newSectionEnabled: row?.newSectionEnabled ?? DEFAULTS.newSectionEnabled,
      newProductIds: nIds,
      newProductsLimit: row?.newProductsLimit ?? DEFAULTS.newProductsLimit,
      livingSectionTitle: row?.livingSectionTitle ?? DEFAULTS.livingSectionTitle,
      livingProductsMode: resolveListMode(row?.livingProductsMode, lIds.length > 0),
      livingSectionEnabled: row?.livingSectionEnabled ?? DEFAULTS.livingSectionEnabled,
      livingProductIds: lIds,
      livingLimit: row?.livingLimit ?? DEFAULTS.livingLimit,
      newsSectionTitle: row?.newsSectionTitle ?? DEFAULTS.newsSectionTitle,
      newsMode: row?.newsMode === "CUSTOM" ? "CUSTOM" : "AUTO",
      newsSectionEnabled: row?.newsSectionEnabled ?? DEFAULTS.newsSectionEnabled,
      newsPostIds: pIds,
      newsLimit: row?.newsLimit ?? DEFAULTS.newsLimit,
      shopLookSectionEnabled: row?.shopLookSectionEnabled ?? DEFAULTS.shopLookSectionEnabled,
      shopLookTitle: row?.shopLookTitle ?? DEFAULTS.shopLookTitle,
      shopLookSubtitle: row?.shopLookSubtitle ?? DEFAULTS.shopLookSubtitle,
      shopLookMode: row?.shopLookMode === "CUSTOM" ? "CUSTOM" : "AUTO",
      shopLookCardLimit: row?.shopLookCardLimit ?? DEFAULTS.shopLookCardLimit,
      shopLookOrderIds: slIds,
      sectionBlockOrder: normalizeHomeSectionBlockOrder(row?.sectionBlockOrder),
    },
    resolved: {
      featuredProducts: sortByIds(fp, fIds),
      newProducts: sortByIds(np, nIds),
      livingProducts: sortByIds(lp, lIds),
      newsPosts: sortByIds(bp, pIds),
      shopLookLooks: sortByIds(slLooks, slIds),
    },
  });
}

export async function PATCH(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const d = parsed.data;
  const existingRaw = await prisma.homePageConfig.findUnique({ where: { id: "default" } });
  const existing = asConfigRow(existingRaw);

  const nextFeaturedIds = d.featuredProductIds ?? parseIds(existing?.featuredProductIds) ?? DEFAULTS.featuredProductIds;
  const nextLivingIds = d.livingProductIds ?? parseIds(existing?.livingProductIds) ?? DEFAULTS.livingProductIds;
  const nextFeaturedMode =
    d.featuredProductsMode ??
    existing?.featuredProductsMode ??
    (nextFeaturedIds.length > 0 ? "CUSTOM" : "AUTO");
  const nextLivingMode =
    d.livingProductsMode ?? existing?.livingProductsMode ?? (nextLivingIds.length > 0 ? "CUSTOM" : "AUTO");

  const nextShopLookIds = d.shopLookOrderIds ?? parseIds(existing?.shopLookOrderIds) ?? DEFAULTS.shopLookOrderIds;
  const nextShopLookMode =
    d.shopLookMode ??
    (existing?.shopLookMode === "CUSTOM" || existing?.shopLookMode === "AUTO"
      ? (existing.shopLookMode as "AUTO" | "CUSTOM")
      : nextShopLookIds.length > 0
        ? "CUSTOM"
        : "AUTO");

  const merged = {
    featuredTitle: d.featuredTitle ?? existing?.featuredTitle ?? DEFAULTS.featuredTitle,
    featuredProductsMode: nextFeaturedMode,
    featuredSectionEnabled: d.featuredSectionEnabled ?? existing?.featuredSectionEnabled ?? DEFAULTS.featuredSectionEnabled,
    featuredProductIds: nextFeaturedIds,
    newSectionTitle: d.newSectionTitle ?? existing?.newSectionTitle ?? DEFAULTS.newSectionTitle,
    newProductsMode: d.newProductsMode ?? existing?.newProductsMode ?? DEFAULTS.newProductsMode,
    newSectionEnabled: d.newSectionEnabled ?? existing?.newSectionEnabled ?? DEFAULTS.newSectionEnabled,
    newProductIds: d.newProductIds ?? parseIds(existing?.newProductIds) ?? DEFAULTS.newProductIds,
    newProductsLimit: d.newProductsLimit ?? existing?.newProductsLimit ?? DEFAULTS.newProductsLimit,
    livingSectionTitle: d.livingSectionTitle ?? existing?.livingSectionTitle ?? DEFAULTS.livingSectionTitle,
    livingProductsMode: nextLivingMode,
    livingSectionEnabled: d.livingSectionEnabled ?? existing?.livingSectionEnabled ?? DEFAULTS.livingSectionEnabled,
    livingCategorySlug: AUTO_LIVING_CATEGORY_SLUG,
    livingProductIds: nextLivingIds,
    livingLimit: d.livingLimit ?? existing?.livingLimit ?? DEFAULTS.livingLimit,
    newsSectionTitle: d.newsSectionTitle ?? existing?.newsSectionTitle ?? DEFAULTS.newsSectionTitle,
    newsMode: d.newsMode ?? existing?.newsMode ?? DEFAULTS.newsMode,
    newsSectionEnabled: d.newsSectionEnabled ?? existing?.newsSectionEnabled ?? DEFAULTS.newsSectionEnabled,
    newsPostIds: d.newsPostIds ?? parseIds(existing?.newsPostIds) ?? DEFAULTS.newsPostIds,
    newsLimit: d.newsLimit ?? existing?.newsLimit ?? DEFAULTS.newsLimit,
    shopLookSectionEnabled:
      d.shopLookSectionEnabled ?? existing?.shopLookSectionEnabled ?? DEFAULTS.shopLookSectionEnabled,
    shopLookTitle: d.shopLookTitle ?? existing?.shopLookTitle ?? DEFAULTS.shopLookTitle,
    shopLookSubtitle: d.shopLookSubtitle ?? existing?.shopLookSubtitle ?? DEFAULTS.shopLookSubtitle,
    shopLookMode: nextShopLookMode,
    shopLookCardLimit: d.shopLookCardLimit ?? existing?.shopLookCardLimit ?? DEFAULTS.shopLookCardLimit,
    shopLookOrderIds: nextShopLookIds,
    sectionBlockOrder: normalizeHomeSectionBlockOrder(
      d.sectionBlockOrder ?? (existing as { sectionBlockOrder?: unknown }).sectionBlockOrder,
    ),
  };

  try {
    await prisma.homePageConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...merged,
      },
      update: merged,
    });
  } catch (e) {
    console.error("[api/admin/homepage PATCH]", e);
    return NextResponse.json(
      {
        error:
          "Không lưu được cấu hình. Chạy `npx prisma generate`, xóa thư mục `.next`, khởi động lại `npm run dev` và kiểm tra migrate DB.",
      },
      { status: 500 },
    );
  }

  await invalidateHomeSectionsCache();

  const touched = Object.keys(d);
  await recordAdminAudit({
    actorUserId: gate.session.sub,
    action: "ui.homepage_update",
    entityType: "HomePageConfig",
    entityId: "default",
    summary:
      touched.length > 0 ? `Cấu hình trang chủ (${touched.length} trường)` : "Lưu cấu hình trang chủ",
    metadata: { fields: touched },
  });

  return NextResponse.json({ ok: true });
}
