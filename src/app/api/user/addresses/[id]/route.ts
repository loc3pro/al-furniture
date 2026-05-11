import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

const patchBody = z.object({
  line: z.string().min(1).max(500).optional(),
  ward: z.string().max(200).optional().nullable(),
  district: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(200).optional(),
  isDefault: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function getOwnedAddress(userId: string, id: string) {
  return prisma.address.findFirst({
    where: { id, userId },
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const existing = await getOwnedAddress(gate.session.sub, id);
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy địa chỉ" }, { status: 404 });
  }

  const d = parsed.data;
  const updated = await prisma.$transaction(async (tx) => {
    if (d.isDefault === true) {
      await tx.address.updateMany({
        where: { userId: gate.session.sub },
        data: { isDefault: false },
      });
    }
    return tx.address.update({
      where: { id },
      data: {
        ...(d.line !== undefined ? { line: d.line } : {}),
        ...(d.ward !== undefined ? { ward: d.ward } : {}),
        ...(d.district !== undefined ? { district: d.district } : {}),
        ...(d.city !== undefined ? { city: d.city } : {}),
        ...(d.isDefault !== undefined ? { isDefault: d.isDefault } : {}),
      },
    });
  });

  return NextResponse.json({ address: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await getOwnedAddress(gate.session.sub, id);
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy địa chỉ" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    if (existing.isDefault) {
      const nextAddr = await tx.address.findFirst({
        where: { userId: gate.session.sub },
        orderBy: { createdAt: "asc" },
      });
      if (nextAddr) {
        await tx.address.update({
          where: { id: nextAddr.id },
          data: { isDefault: true },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
