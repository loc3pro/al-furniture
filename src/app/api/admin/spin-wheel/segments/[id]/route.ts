import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";

const patchSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  sortOrder: z.number().int().min(0).optional(),
  weight: z.number().int().min(0).max(100).optional(),
  quantityCap: z.number().int().min(1).max(10_000_000).optional(),
  quantityWon: z.number().int().min(0).optional(),
  discountType: z.enum(["PERCENT", "FIXED"]).optional(),
  discountValue: z.number().int().min(0).optional(),
  discountMaxVnd: z.number().int().min(0).max(999_999_999).optional(),
  validityDays: z.number().int().min(1).max(365).optional(),
  minOrderAmount: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const cur = await prisma.spinWheelSegment.findUnique({ where: { id } });
  if (!cur) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }

  const d = parsed.data;
  const mergedType = (d.discountType ?? cur.discountType) as "PERCENT" | "FIXED";
  if (d.quantityCap != null && d.quantityCap < cur.quantityWon) {
    return NextResponse.json(
      { error: `Giới hạn phần thưởng không được nhỏ hơn số đã trúng (${cur.quantityWon}).` },
      { status: 400 },
    );
  }

  const seg = await prisma.spinWheelSegment.update({
    where: { id },
    data: {
      ...(d.label !== undefined ? { label: d.label.trim() } : {}),
      ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
      ...(d.weight !== undefined ? { weight: d.weight } : {}),
      ...(d.quantityCap !== undefined ? { quantityCap: d.quantityCap } : {}),
      ...(d.quantityWon !== undefined ? { quantityWon: d.quantityWon } : {}),
      ...(d.discountType !== undefined ? { discountType: d.discountType } : {}),
      ...(d.discountValue !== undefined ? { discountValue: d.discountValue } : {}),
      ...(mergedType === "FIXED"
        ? { discountMaxVnd: 0 }
        : d.discountMaxVnd !== undefined
          ? { discountMaxVnd: d.discountMaxVnd }
          : {}),
      ...(d.validityDays !== undefined ? { validityDays: d.validityDays } : {}),
      ...(d.minOrderAmount !== undefined ? { minOrderAmount: d.minOrderAmount } : {}),
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });

  return NextResponse.json(seg);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  try {
    await prisma.spinWheelSegment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không xóa được (có thể đã có mã đã phát)." }, { status: 400 });
  }
}
