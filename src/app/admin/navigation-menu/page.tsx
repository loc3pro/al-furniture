import { prisma } from "@/lib/prisma";
import {
  clampNavMenuMaxCategories,
  clampNavMenuMaxProducts,
  parseCategorySlugsOrdered,
  parseProductSlugsByCategory,
  SHOP_NAV_MENU_ABS_MAX_CATEGORIES,
  SHOP_NAV_MENU_ABS_MAX_PRODUCTS,
  type ShopNavigationMenuResolved,
} from "@/lib/shop-navigation-menu";
import { NavigationMenuEditor } from "./NavigationMenuEditor";
import styles from "./navigation-menu.module.scss";

export default async function AdminNavigationMenuPage() {
  let row = null;
  try {
    row = await prisma.shopNavigationMenuConfig.findUnique({ where: { id: "default" } });
  } catch {
    row = null;
  }
  if (!row) {
    row = await prisma.shopNavigationMenuConfig.create({ data: { id: "default" } });
  }

  const eligible = await prisma.category.findMany({
    where: { parentId: null, slug: { not: "phong-khach" } },
    select: { id: true, slug: true, nameVi: true },
    orderBy: { nameVi: "asc" },
  });

  const productsByCat = await Promise.all(
    eligible.map((c) =>
      prisma.product.findMany({
        where: { categoryId: c.id },
        select: { slug: true, nameVi: true },
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

  const initialConfig: ShopNavigationMenuResolved = {
    maxCategoriesShown: clampNavMenuMaxCategories(row.maxCategoriesShown),
    maxProductsPerCategory: clampNavMenuMaxProducts(row.maxProductsPerCategory),
    categorySlugsOrdered: parseCategorySlugsOrdered(row.categorySlugsOrdered),
    productSlugsByCategory: parseProductSlugsByCategory(row.productSlugsByCategory),
  };

  return (
    <NavigationMenuEditor
      header={
        <header className={styles.head}>
          <h1 className={styles.title}>Menu header cửa hàng</h1>
        </header>
      }
      initialConfig={initialConfig}
      categoriesWithProducts={categoriesWithProducts}
      limits={{ maxCategories: SHOP_NAV_MENU_ABS_MAX_CATEGORIES, maxProducts: SHOP_NAV_MENU_ABS_MAX_PRODUCTS }}
    />
  );
}
