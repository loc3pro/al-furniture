import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { asciiFilenameSafe, rowsToCsv, type CsvColumn } from "@/lib/admin-csv";
import {
  adminProductsOrderBy,
  adminProductsWhere,
  parseAdminProductSort,
} from "@/lib/admin-products-query";
import { productSaleBase } from "@/lib/money";
import { staffDisplayName } from "@/lib/admin-staff-label";

const COLS: CsvColumn[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Ten_san_pham" },
  { key: "productCode", header: "Ma_SP" },
  { key: "slug", header: "Slug" },
  { key: "categoryName", header: "Danh_muc" },
  { key: "basePrice", header: "Gia_goc_VND" },
  { key: "discountPercent", header: "Giam_gia_percent" },
  { key: "saleUnitVnd", header: "Gia_ban_don_vi_VND" },
  { key: "variantCount", header: "So_bien_the" },
  { key: "totalStock", header: "Tong_ton" },
  { key: "isFeatured", header: "Noi_bat" },
  { key: "viewCount", header: "Luot_xem" },
  { key: "soldCount", header: "Da_ban_SP" },
  { key: "createdBy", header: "Nguoi_tao_SP" },
  { key: "createdAt", header: "Tao_luc" },
  { key: "updatedAt", header: "Cap_nhat" },
];

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const categoryIdParam = (searchParams.get("categoryId") ?? "").trim();
  const { key: sortKey, dir: sortDir } = parseAdminProductSort(
    searchParams.get("sort") ?? undefined,
    searchParams.get("dir") ?? undefined,
  );

  let categoryIds = new Set<string>();
  try {
    const cats = await prisma.category.findMany({ select: { id: true } });
    categoryIds = new Set(cats.map((c) => c.id));
  } catch {
    categoryIds = new Set();
  }

  const where = adminProductsWhere(q, categoryIdParam, categoryIds);
  const orderBy = adminProductsOrderBy(sortKey, sortDir);

  let rows: Record<string, unknown>[] = [];
  try {
    const products = await prisma.product.findMany({
      where,
      orderBy,
      include: {
        category: { select: { nameVi: true } },
        variants: { select: { stockQuantity: true } },
        createdBy: { select: { name: true, email: true } },
      },
    });
    rows = products.map((p) => {
      const totalStock = p.variants.reduce((s, v) => s + v.stockQuantity, 0);
      return {
        id: p.id,
        name: p.nameVi,
        productCode: p.productCode ?? "",
        slug: p.slug,
        categoryName: p.category.nameVi,
        basePrice: p.basePrice,
        discountPercent: p.discountPercent,
        saleUnitVnd: productSaleBase(p),
        variantCount: p.variants.length,
        totalStock,
        isFeatured: p.isFeatured ? "1" : "0",
        viewCount: p.viewCount,
        soldCount: p.soldCount,
        createdBy: staffDisplayName(p.createdBy),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  } catch {
    rows = [];
  }

  const csv = rowsToCsv(COLS, rows);
  const name = asciiFilenameSafe(`san-pham_${new Date().toISOString().slice(0, 10)}.csv`);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
