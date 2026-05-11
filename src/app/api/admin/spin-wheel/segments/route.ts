import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";

const createSchema = z.object({
  label: z.string().min(1).max(120),
  /** Tỷ lệ 0–100: số càng cao càng dễ trúng; 0 = không tham gia vòng quay. Xác suất = weight/sum(weights ô đủ điều kiện). */
  weight: z.number().int().min(0).max(100),
  quantityCap: z.number().int().min(1).max(10_000_000),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.number().int().min(0),
  /** Trần VNĐ khi giảm % (0 = không trần). Với FIXED thường gửi 0. */
  discountMaxVnd: z.number().int().min(0).max(999_999_999).optional(),
  validityDays: z.number().int().min(1).max(365),
  minOrderAmount: z.number().int().min(0),
  active: z.boolean().optional(),
});

export async function GET() {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const rows = await prisma.spinWheelSegment.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ segments: rows });
}

export async function POST(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  if (parsed.data.discountType === "PERCENT" && parsed.data.discountValue > 100) {
    return NextResponse.json({ error: "Giảm % tối đa 100." }, { status: 400 });
  }

  const maxSort = await prisma.spinWheelSegment.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  const maxVnd =
    parsed.data.discountType === "PERCENT"
      ? (parsed.data.discountMaxVnd ?? 0)
      : 0;

  const seg = await prisma.spinWheelSegment.create({
    data: {
      sortOrder,
      label: parsed.data.label.trim(),
      weight: parsed.data.weight,
      quantityCap: parsed.data.quantityCap,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      discountMaxVnd: maxVnd,
      validityDays: parsed.data.validityDays,
      minOrderAmount: parsed.data.minOrderAmount,
      active: parsed.data.active ?? true,
    },
  });

  return NextResponse.json(seg);
}
