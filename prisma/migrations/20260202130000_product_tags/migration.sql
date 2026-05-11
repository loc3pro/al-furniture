-- Product catalog tags (shop pills + admin)
ALTER TABLE "Product" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
