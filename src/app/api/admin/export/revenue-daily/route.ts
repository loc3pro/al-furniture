import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { asciiFilenameSafe, rowsToCsv, type CsvColumn } from "@/lib/admin-csv";
import {
  dateKeysInclusiveUtc,
  parseIsoDateOrNull,
  utcDayEnd,
  utcDayStart,
  validateRangeDays,
} from "@/lib/admin-reports-summary";

const COLS: CsvColumn[] = [
  { key: "day", header: "Ngay" },
  { key: "orderCount", header: "So_don_hoan_thanh" },
  { key: "revenueVnd", header: "Doanh_thu_VND" },
];

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const fromQ = parseIsoDateOrNull(searchParams.get("from"));
  const toQ = parseIsoDateOrNull(searchParams.get("to"));

  type DayAgg = { day: string; orderCount: number; revenueVnd: number };
  const map = new Map<string, DayAgg>();
  let keys: string[] = [];
  let fileSuffix = "";

  try {
    if (fromQ && toQ && fromQ <= toQ && validateRangeDays(fromQ, toQ) !== null) {
      const since = utcDayStart(fromQ);
      const until = utcDayEnd(toQ);
      keys = dateKeysInclusiveUtc(fromQ, toQ);
      fileSuffix = `${fromQ}_${toQ}`;
      const orders = await prisma.order.findMany({
        where: { status: OrderStatus.COMPLETED, createdAt: { gte: since, lte: until } },
        select: { totalAmount: true, createdAt: true },
      });
      for (const o of orders) {
        const day = o.createdAt.toISOString().slice(0, 10);
        const cur = map.get(day) ?? { day, orderCount: 0, revenueVnd: 0 };
        cur.orderCount += 1;
        cur.revenueVnd += o.totalAmount;
        map.set(day, cur);
      }
    } else {
      const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") ?? "30", 10) || 30));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      fileSuffix = `${days}d`;
      const orders = await prisma.order.findMany({
        where: { status: OrderStatus.COMPLETED, createdAt: { gte: since } },
        select: { totalAmount: true, createdAt: true },
      });
      for (const o of orders) {
        const day = o.createdAt.toISOString().slice(0, 10);
        const cur = map.get(day) ?? { day, orderCount: 0, revenueVnd: 0 };
        cur.orderCount += 1;
        cur.revenueVnd += o.totalAmount;
        map.set(day, cur);
      }
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (days - 1 - i));
        keys.push(d.toISOString().slice(0, 10));
      }
    }
  } catch {
    /* ignore */
  }

  const rows = keys.map((day) => {
    const g = map.get(day);
    return {
      day,
      orderCount: g?.orderCount ?? 0,
      revenueVnd: g?.revenueVnd ?? 0,
    };
  });

  const csv = rowsToCsv(COLS, rows);
  const name = asciiFilenameSafe(
    `doanh-thu-theo-ngay_${fileSuffix || "range"}_${new Date().toISOString().slice(0, 10)}.csv`,
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
