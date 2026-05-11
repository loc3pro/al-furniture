-- CreateTable
CREATE TABLE "ShopNavigationMenuConfig" (
    "id" TEXT NOT NULL,
    "maxCategoriesShown" INTEGER NOT NULL DEFAULT 6,
    "maxProductsPerCategory" INTEGER NOT NULL DEFAULT 5,
    "categorySlugsOrdered" JSONB NOT NULL DEFAULT '[]',
    "productSlugsByCategory" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopNavigationMenuConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ShopNavigationMenuConfig" ("id", "maxCategoriesShown", "maxProductsPerCategory", "categorySlugsOrdered", "productSlugsByCategory", "updatedAt")
VALUES ('default', 6, 5, '[]', '{}', CURRENT_TIMESTAMP);
