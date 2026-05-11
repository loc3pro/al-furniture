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
import { staffDisplayName } from "@/lib/admin-staff-label";

const MAX_ROWS = 10_000;

const COLS: CsvColumn[] = [
  { key: "orderNumber", header: "Ma_don_hien_thi" },
  { key: "id", header: "ID_don_CUID" },
  { key: "createdAt", header: "Ngay_tao" },
  { key: "status", header: "Trang_thai" },
  { key: "totalAmount", header: "Tong_tien_VND" },
  { key: "payMode", header: "Che_do_tt" },
  { key: "paymentMethod", header: "PTTT" },
  { key: "itemCount", header: "So_dong_hang" },
  { key: "qtySum", header: "Tong_SL" },
  { key: "customerName", header: "Khach_ten" },
  { key: "customerPhone", header: "Khach_SDT" },
  { key: "customerEmail", header: "Khach_email" },
  { key: "shipCity", header: "Giao_tinh" },
  { key: "userEmail", header: "User_email" },
  { key: "placedByStaff", header: "Admin_tao_don" },
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

  let rows: Record<string, unknown>[] = [];
  try {
    const orders = await prisma.order.findMany({
      where,
      orderBy,
      take: MAX_ROWS,
      include: {
        items: { select: { quantity: true } },
        user: { select: { email: true } },
        placedBy: { select: { name: true, email: true } },
      },
    });
    rows = orders.map((o) => {
      const addr = o.shippingAddress as Record<string, string | undefined>;
      const qtySum = o.items.reduce((s, it) => s + it.quantity, 0);
      return {
        orderNumber: o.orderNumber,
        id: o.id,
        createdAt: o.createdAt.toISOString(),
        status: orderStatusLabel(o.status),
        totalAmount: o.totalAmount,
        payMode: o.payMode,
        paymentMethod: o.paymentMethod,
        itemCount: o.items.length,
        qtySum,
        customerName: addr?.name ?? "",
        customerPhone: addr?.phone ?? "",
        customerEmail: addr?.email ?? "",
        shipCity: addr?.city ?? "",
        userEmail: o.user?.email ?? "",
        placedByStaff: staffDisplayName(o.placedBy),
      };
    });
  } catch {
    rows = [];
  }

  const csv = rowsToCsv(COLS, rows);
  const dateStr = new Date().toISOString().slice(0, 10);
  const orderRowCount = rows.length;
  const name = asciiFilenameSafe(
    idFilter && idFilter.length > 0
      ? `don-hang_chon-${orderRowCount}-don_${dateStr}.csv`
      : `don-hang_tat-ca-bo-loc_${tab}_${orderRowCount}-dong_${dateStr}.csv`,
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
