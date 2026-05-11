import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import {
  clampNavMenuMaxCategories,
  clampNavMenuMaxProducts,
  parseCategorySlugsOrdered,
  parseProductSlugsByCategory,
  SHOP_NAV_MENU_ABS_MAX_CATEGORIES,
  SHOP_NAV_MENU_ABS_MAX_PRODUCTS,
  SHOP_NAV_MENU_DEFAULT_MAX_CATEGORIES,
  SHOP_NAV_MENU_DEFAULT_MAX_PRODUCTS,
} from "@/lib/shop-navigation-menu";

const PatchBody = z.object({
  maxCategoriesShown: z.number().int().optional(),
  maxProductsPerCategory: z.number().int().optional(),
  categorySlugsOrdered: z.array(z.string()).optional(),
  productSlugsByCategory: z.record(z.string(), z.array(z.string())).optional(),
});

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let row = null;
  try {
    row = await prisma.shopNavigationMenuConfig.findUnique({
      where: { id: "default" },
    });
  } catch {
    row = null;
  }

  if (!row) {
    row = await prisma.shopNavigationMenuConfig.create({
      data: { id: "default" },
    });
  }

  const eligible = await prisma.category.findMany({
    where: { parentId: null, slug: { not: "phong-khach" } },
    select: { slug: true, nameVi: true, nameEn: true, id: true },
    orderBy: { nameVi: "asc" },
  });

  const productsByCat = await Promise.all(
    eligible.map((c) =>
      prisma.product.findMany({
        where: { categoryId: c.id },
        select: { slug: true, nameVi: true, nameEn: true },
        orderBy: { nameVi: "asc" },
        take: 120,
      }),
    ),
  );

  const categoriesWithProducts = eligible.map((c, i) => ({
    slug: c.slug,
    name: c.nameVi,
    products: productsByCat[i]!.map((p) => ({ slug: p.slug, name: p.nameVi })),
  }));

  return NextResponse.json({
    config: {
      maxCategoriesShown: row.maxCategoriesShown,
      maxProductsPerCategory: row.maxProductsPerCategory,
      categorySlugsOrdered: parseCategorySlugsOrdered(row.categorySlugsOrdered),
      productSlugsByCategory: parseProductSlugsByCategory(row.productSlugsByCategory),
    },
    limits: {
      maxCategories: SHOP_NAV_MENU_ABS_MAX_CATEGORIES,
      maxProducts: SHOP_NAV_MENU_ABS_MAX_PRODUCTS,
    },
    categoriesWithProducts,
  });
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ" }, { status: 400 });
  }

  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ", issues: parsed.error.flatten() }, { status: 400 });
  }

  const eligible = await prisma.category.findMany({
    where: { parentId: null, slug: { not: "phong-khach" } },
    select: { slug: true, id: true },
  });
  const slugOk = new Set(eligible.map((c) => c.slug));
  const catIdBySlug = new Map(eligible.map((c) => [c.slug, c.id]));

  const existing = await prisma.shopNavigationMenuConfig.findUnique({ where: { id: "default" } });

  const maxCat = clampNavMenuMaxCategories(
    parsed.data.maxCategoriesShown ?? existing?.maxCategoriesShown ?? SHOP_NAV_MENU_DEFAULT_MAX_CATEGORIES,
  );
  const maxProd = clampNavMenuMaxProducts(
    parsed.data.maxProductsPerCategory ?? existing?.maxProductsPerCategory ?? SHOP_NAV_MENU_DEFAULT_MAX_PRODUCTS,
  );

  let orderedSlugs = parseCategorySlugsOrdered(existing?.categorySlugsOrdered);
  if (parsed.data.categorySlugsOrdered != null) {
    orderedSlugs = parsed.data.categorySlugsOrdered.filter((s) => slugOk.has(s));
  }

  let pinsObj = parseProductSlugsByCategory(existing?.productSlugsByCategory);
  if (parsed.data.productSlugsByCategory != null) {
    pinsObj = {};
    for (const [catSlug, slugs] of Object.entries(parsed.data.productSlugsByCategory)) {
      if (!slugOk.has(catSlug)) continue;
      const cid = catIdBySlug.get(catSlug);
      if (!cid) continue;
      const unique = [...new Set(slugs)].slice(0, SHOP_NAV_MENU_ABS_MAX_PRODUCTS);
      const valid = await prisma.product.findMany({
        where: { categoryId: cid, slug: { in: unique } },
        select: { slug: true },
      });
      const vset = new Set(valid.map((p) => p.slug));
      pinsObj[catSlug] = unique.filter((s) => vset.has(s)).slice(0, maxProd);
    }
  }

  await prisma.shopNavigationMenuConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      maxCategoriesShown: maxCat,
      maxProductsPerCategory: maxProd,
      categorySlugsOrdered: orderedSlugs,
      productSlugsByCategory: pinsObj,
    },
    update: {
      maxCategoriesShown: maxCat,
      maxProductsPerCategory: maxProd,
      categorySlugsOrdered: orderedSlugs,
      productSlugsByCategory: pinsObj,
    },
  });

  const row = await prisma.shopNavigationMenuConfig.findUniqueOrThrow({ where: { id: "default" } });

  revalidatePath("/");

  await recordAdminAudit({
    actorUserId: gate.session.sub,
    action: "ui.navigation_menu_update",
    entityType: "ShopNavigationMenuConfig",
    entityId: "default",
    summary: "Cập nhật menu header (mega menu)",
    metadata: {
      maxCategoriesShown: maxCat,
      maxProductsPerCategory: maxProd,
      categoryCount: orderedSlugs.length,
    },
  });

  return NextResponse.json({
    ok: true,
    config: {
      maxCategoriesShown: row.maxCategoriesShown,
      maxProductsPerCategory: row.maxProductsPerCategory,
      categorySlugsOrdered: parseCategorySlugsOrdered(row.categorySlugsOrdered),
      productSlugsByCategory: parseProductSlugsByCategory(row.productSlugsByCategory),
    },
  });
}
