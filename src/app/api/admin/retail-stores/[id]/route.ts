import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateRetailStoresPublicCache } from "@/lib/redis-cache";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().min(1).max(500).optional(),
  phone: z.string().max(40).optional().nullable(),
  openingHours: z.string().max(120).optional().nullable(),
  mapUrl: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const d = parsed.data;
  const mapUrlVal =
    d.mapUrl === undefined ? undefined : d.mapUrl === "" ? null : d.mapUrl;

  const updated = await prisma.$transaction(async (tx) => {
    if (d.isDefault === true) {
      await tx.retailStore.updateMany({ data: { isDefault: false } });
    }
    return tx.retailStore.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name.trim() } : {}),
        ...(d.address !== undefined ? { address: d.address.trim() } : {}),
        ...(d.phone !== undefined ? { phone: d.phone?.trim() || null } : {}),
        ...(d.openingHours !== undefined ? { openingHours: d.openingHours?.trim() || null } : {}),
        ...(mapUrlVal !== undefined ? { mapUrl: mapUrlVal } : {}),
        ...(d.sortOrder !== undefined ? { sortOrder: d.sortOrder } : {}),
        ...(d.active !== undefined ? { active: d.active } : {}),
        ...(d.isDefault !== undefined ? { isDefault: d.isDefault } : {}),
      },
    });
  });
  await invalidateRetailStoresPublicCache();
  return NextResponse.json({ store: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  await prisma.retailStore.delete({ where: { id } });
  await invalidateRetailStoresPublicCache();
  return NextResponse.json({ ok: true });
}
