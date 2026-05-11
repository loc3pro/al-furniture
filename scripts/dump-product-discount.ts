/**
 * Xuất dữ liệu giảm giá sản phẩm: basePrice, discountPercent, salePrice
 * Chạy: npx tsx scripts/dump-product-discount.ts
 * Hoặc: npm run dump:discount
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../src/lib/prisma";
import { computeSalePrice, formatVnd, productSaleBase } from "../src/lib/money";

async function main() {
  const rows = await prisma.product.findMany({
    orderBy: { nameVi: "asc" },
    select: {
      id: true,
      slug: true,
      nameVi: true,
      basePrice: true,
      discountPercent: true,
      salePrice: true,
      updatedAt: true,
    },
  });

  const out = rows.map((p) => {
    const effective = productSaleBase({ basePrice: p.basePrice, salePrice: p.salePrice });
    const expectedSale = computeSalePrice(p.basePrice, p.discountPercent);
    return {
      id: p.id,
      slug: p.slug,
      name: p.nameVi,
      basePriceVnd: p.basePrice,
      basePriceLabel: formatVnd(p.basePrice),
      discountPercent: p.discountPercent,
      salePriceStored: p.salePrice,
      salePriceVnd: effective,
      salePriceLabel: formatVnd(effective),
      expectedFromPercent: expectedSale,
      inSync: p.salePrice == null || p.salePrice === expectedSale,
      updatedAt: p.updatedAt.toISOString(),
    };
  });

  const json = JSON.stringify(out, null, 2);
  console.log(json);

  const outDir = join(process.cwd(), "data");
  try {
    mkdirSync(outDir, { recursive: true });
  } catch {
    /* exists */
  }
  const outFile = join(outDir, "product-discount-dump.json");
  writeFileSync(outFile, json, "utf8");
  console.error(`\nĐã ghi: ${outFile} (${out.length} sản phẩm)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
