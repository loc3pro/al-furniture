-- Header hotline + shipping promo text (ThemeSettings)
ALTER TABLE "ThemeSettings" ADD COLUMN "headerHotlineLabel" TEXT NOT NULL DEFAULT 'Hotline';
ALTER TABLE "ThemeSettings" ADD COLUMN "headerHotlinePhone" TEXT NOT NULL DEFAULT '0931 799 744';
ALTER TABLE "ThemeSettings" ADD COLUMN "headerShippingLine1" TEXT NOT NULL DEFAULT 'Miễn phí vận chuyển HCM';
ALTER TABLE "ThemeSettings" ADD COLUMN "headerShippingLine2" TEXT NOT NULL DEFAULT 'Hóa đơn trên 2.000.000₫';
