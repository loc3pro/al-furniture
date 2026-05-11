-- AlterTable
ALTER TABLE "HomePageConfig" ADD COLUMN     "shopLookCardLimit" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "shopLookMode" TEXT NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "shopLookOrderIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "shopLookSectionEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "shopLookSubtitle" TEXT NOT NULL DEFAULT 'Cảm hứng phối nội thất phòng khách hiện đại — tông trung tính, chất liệu tự nhiên.',
ADD COLUMN     "shopLookTitle" TEXT NOT NULL DEFAULT 'Shop the look';

-- AlterTable
ALTER TABLE "ShopNavigationMenuConfig" ALTER COLUMN "id" SET DEFAULT 'default';

-- AlterTable
ALTER TABLE "SpinWheelConfig" ALTER COLUMN "id" SET DEFAULT 'default',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SpinWheelSegment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ShopTheLook" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "heroImageUrl" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "editorZoom" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopTheLook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopTheLookHotspot" (
    "id" TEXT NOT NULL,
    "lookId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "xPercent" DOUBLE PRECISION NOT NULL,
    "yPercent" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShopTheLookHotspot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "questionVi" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "answerVi" TEXT NOT NULL,
    "answerEn" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteIntegrationSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "general" JSONB NOT NULL DEFAULT '{}',
    "api" JSONB NOT NULL DEFAULT '{}',
    "payment" JSONB NOT NULL DEFAULT '{}',
    "cloud" JSONB NOT NULL DEFAULT '{}',
    "seo" JSONB NOT NULL DEFAULT '{}',
    "display" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteIntegrationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminManagedKey" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "envKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminManagedKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopTheLook_slug_key" ON "ShopTheLook"("slug");

-- CreateIndex
CREATE INDEX "ShopTheLook_published_sortOrder_idx" ON "ShopTheLook"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "ShopTheLookHotspot_lookId_idx" ON "ShopTheLookHotspot"("lookId");

-- CreateIndex
CREATE INDEX "ShopTheLookHotspot_productId_idx" ON "ShopTheLookHotspot"("productId");

-- CreateIndex
CREATE INDEX "FaqItem_published_sortOrder_idx" ON "FaqItem"("published", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AdminManagedKey_envKey_key" ON "AdminManagedKey"("envKey");

-- CreateIndex
CREATE INDEX "AdminManagedKey_sortOrder_idx" ON "AdminManagedKey"("sortOrder");

-- CreateIndex
CREATE INDEX "AdminManagedKey_enabled_idx" ON "AdminManagedKey"("enabled");

-- AddForeignKey
ALTER TABLE "ShopTheLookHotspot" ADD CONSTRAINT "ShopTheLookHotspot_lookId_fkey" FOREIGN KEY ("lookId") REFERENCES "ShopTheLook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopTheLookHotspot" ADD CONSTRAINT "ShopTheLookHotspot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
