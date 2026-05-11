import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateBankAccountsPublicCache } from "@/lib/redis-cache";

const patchSchema = z.object({
  bankName: z.string().min(1).max(120).optional(),
  accountHolder: z.string().min(1).max(200).optional(),
  accountNumber: z.string().min(4).max(40).optional(),
  branch: z.string().max(200).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  qrCodeUrl: z.string().max(800).optional().nullable(),
  active: z.boolean().optional(),
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
  const updated = await prisma.bankAccount.update({
    where: { id },
    data: {
      ...(d.bankName !== undefined ? { bankName: d.bankName.trim() } : {}),
      ...(d.accountHolder !== undefined ? { accountHolder: d.accountHolder.trim() } : {}),
      ...(d.accountNumber !== undefined
        ? { accountNumber: d.accountNumber.trim().replace(/\s+/g, " ") }
        : {}),
      ...(d.branch !== undefined ? { branch: d.branch?.trim() || null } : {}),
      ...(d.note !== undefined ? { note: d.note?.trim() || null } : {}),
      ...(d.qrCodeUrl !== undefined ? { qrCodeUrl: d.qrCodeUrl?.trim() || null } : {}),
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });
  await invalidateBankAccountsPublicCache();
  return NextResponse.json({ account: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  await prisma.bankAccount.delete({ where: { id } });
  await invalidateBankAccountsPublicCache();
  return NextResponse.json({ ok: true });
}
