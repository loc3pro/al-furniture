-- Category: split display fields into Vi / En
ALTER TABLE "Category" ADD COLUMN "nameVi" TEXT;
ALTER TABLE "Category" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "Category" ADD COLUMN "metaTitleVi" TEXT;
ALTER TABLE "Category" ADD COLUMN "metaTitleEn" TEXT;
ALTER TABLE "Category" ADD COLUMN "metaDescriptionVi" TEXT;
ALTER TABLE "Category" ADD COLUMN "metaDescriptionEn" TEXT;

UPDATE "Category" SET
  "nameVi" = "name",
  "nameEn" = "name",
  "metaTitleVi" = "metaTitle",
  "metaTitleEn" = "metaTitle",
  "metaDescriptionVi" = "metaDescription",
  "metaDescriptionEn" = "metaDescription";

ALTER TABLE "Category" ALTER COLUMN "nameVi" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "nameEn" SET NOT NULL;

ALTER TABLE "Category" DROP COLUMN "name";
ALTER TABLE "Category" DROP COLUMN "metaTitle";
ALTER TABLE "Category" DROP COLUMN "metaDescription";

-- Product
ALTER TABLE "Product" ADD COLUMN "nameVi" TEXT;
ALTER TABLE "Product" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "Product" ADD COLUMN "brandNameVi" TEXT;
ALTER TABLE "Product" ADD COLUMN "brandNameEn" TEXT;
ALTER TABLE "Product" ADD COLUMN "descriptionVi" TEXT;
ALTER TABLE "Product" ADD COLUMN "descriptionEn" TEXT;
ALTER TABLE "Product" ADD COLUMN "metaTitleVi" TEXT;
ALTER TABLE "Product" ADD COLUMN "metaTitleEn" TEXT;
ALTER TABLE "Product" ADD COLUMN "metaDescriptionVi" TEXT;
ALTER TABLE "Product" ADD COLUMN "metaDescriptionEn" TEXT;

UPDATE "Product" SET
  "nameVi" = "name",
  "nameEn" = "name",
  "brandNameVi" = "brandName",
  "brandNameEn" = "brandName",
  "descriptionVi" = "description",
  "descriptionEn" = "description",
  "metaTitleVi" = "metaTitle",
  "metaTitleEn" = "metaTitle",
  "metaDescriptionVi" = "metaDescription",
  "metaDescriptionEn" = "metaDescription";

ALTER TABLE "Product" ALTER COLUMN "nameVi" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "nameEn" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "descriptionVi" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "descriptionEn" SET NOT NULL;

ALTER TABLE "Product" DROP COLUMN "name";
ALTER TABLE "Product" DROP COLUMN "brandName";
ALTER TABLE "Product" DROP COLUMN "description";
ALTER TABLE "Product" DROP COLUMN "metaTitle";
ALTER TABLE "Product" DROP COLUMN "metaDescription";

-- ProductVariant
ALTER TABLE "ProductVariant" ADD COLUMN "colorLabelVi" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN "colorLabelEn" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN "sizeLabelVi" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN "sizeLabelEn" TEXT;

UPDATE "ProductVariant" SET
  "colorLabelVi" = "colorLabel",
  "colorLabelEn" = "colorLabel",
  "sizeLabelVi" = "sizeLabel",
  "sizeLabelEn" = "sizeLabel";

ALTER TABLE "ProductVariant" ALTER COLUMN "colorLabelVi" SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "colorLabelEn" SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "sizeLabelVi" SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "sizeLabelEn" SET NOT NULL;

ALTER TABLE "ProductVariant" DROP COLUMN "colorLabel";
ALTER TABLE "ProductVariant" DROP COLUMN "sizeLabel";
