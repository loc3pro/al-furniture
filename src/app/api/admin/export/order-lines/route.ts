import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { asciiFilenameSafe, rowsToCsv, type CsvColumn } from "@/lib/admin-csv";
import {
  buildOrderListWhere,
  orderByFromSort,
  parseOrderIdsParam,
  parseOrderListTab,
  parseOrderSort,
} from "@/app/admin/orders/order-list-filters";
import { orderStatusLabel } from "@/lib/order-status-vi";

const MAX_ORDERS = 2_000;

const COLS: CsvColumn[] = [
  { key: "orderNumber", header: "Ma_don" },
  { key: "orderId", header: "ID_don_CUID" },
  { key: "orderCreated", header: "Ngay_don" },
  { key: "orderStatus", header: "Trang_thai_don" },
  { key: "orderTotal", header: "Tong_don_VND" },
  { key: "customerName", header: "Khach_ten" },
  { key: "customerPhone", header: "Khach_SDT" },
  { key: "sku", header: "SKU" },
  { key: "productName", header: "San_pham" },
  { key: "color", header: "Mau" },
  { key: "size", header: "Kich_thuoc" },
  { key: "quantity", header: "So_luong" },
  { key: "linePrice", header: "Don_gia_VND" },
  { key: "lineSubtotal", header: "Thanh_tien_VND" },
];

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const tab = parseOrderListTab(searchParams.get("tab") ?? undefined);
  const q = (searchParams.get("q") ?? "").trim();
  const { field: sortField, dir: sortDir } = parseOrderSort(
    searchParams.get("sort") ?? undefined,
    searchParams.get("dir") ?? undefined,
  );

  const idFilter = parseOrderIdsParam(searchParams.get("ids"));
  const baseWhere = buildOrderListWhere(tab, q);
  const where =
    idFilter && idFilter.length > 0 ? { AND: [baseWhere, { id: { in: idFilter } }] } : baseWhere;
  const orderBy = orderByFromSort(sortField, sortDir);

  const rows: Record<string, unknown>[] = [];
  try {
    const orders = await prisma.order.findMany({
      where,
      orderBy,
      take: MAX_ORDERS,
      include: {
        items: {
          include: {
            productVariant: { select: { sku: true, product: { select: { nameVi: true } } } },
          },
        },
      },
    });

    for (const o of orders) {
      const addr = o.shippingAddress as Record<string, string | undefined>;
      for (const it of o.items) {
        const qty = it.quantity;
        const lineSubtotal = qty * it.price;
        rows.push({
          orderNumber: o.orderNumber,
          orderId: o.id,
          orderCreated: o.createdAt.toISOString(),
          orderStatus: orderStatusLabel(o.status),
          orderTotal: o.totalAmount,
          customerName: addr?.name ?? "",
          customerPhone: addr?.phone ?? "",
          sku: it.productVariant.sku,
          productName: it.productVariant.product.nameVi,
          color: it.colorLabelSnapshot,
          size: it.sizeLabelSnapshot,
          quantity: qty,
          linePrice: it.price,
          lineSubtotal,
        });
      }
    }
  } catch {
    /* empty */
  }

  const csv = rowsToCsv(COLS, rows);
  const dateStr = new Date().toISOString().slice(0, 10);
  const lineRowCount = rows.length;
  const name = asciiFilenameSafe(
    idFilter && idFilter.length > 0
      ? `hoa-don-dong-hang_chon-${idFilter.length}-don_${lineRowCount}-dong-hang_${dateStr}.csv`
      : `hoa-don-dong-hang_tat-ca-bo-loc_${tab}_${lineRowCount}-dong-hang_${dateStr}.csv`,
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
