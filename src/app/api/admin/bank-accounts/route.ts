import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/slug";
import { invalidateBankAccountsPublicCache } from "@/lib/redis-cache";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const list = await prisma.bankAccount.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ accounts: list });
}

const postSchema = z.object({
  bankName: z.string().min(1).max(120),
  accountHolder: z.string().min(1).max(200),
  accountNumber: z.string().min(4).max(40),
  branch: z.string().max(200).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  qrCodeUrl: z.string().max(800).optional().nullable(),
  active: z.boolean().optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const d = parsed.data;
  const base = slugify(`${d.bankName}-${d.accountNumber.replace(/\s/g, "")}`);
  let slug = base || `bank-${Date.now().toString(36)}`;
  const exists = await prisma.bankAccount.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;

  const maxAgg = await prisma.bankAccount.aggregate({ _max: { sortOrder: true } });
  const nextSort = (maxAgg._max.sortOrder ?? -1) + 1;

  const row = await prisma.bankAccount.create({
    data: {
      slug,
      bankName: d.bankName.trim(),
      accountHolder: d.accountHolder.trim(),
      accountNumber: d.accountNumber.trim().replace(/\s+/g, " "),
      branch: d.branch?.trim() || null,
      note: d.note?.trim() || null,
      qrCodeUrl: d.qrCodeUrl?.trim() || null,
      sortOrder: nextSort,
      active: d.active ?? true,
    },
  });
  await invalidateBankAccountsPublicCache();
  return NextResponse.json({ account: row });
}
