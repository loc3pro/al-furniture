import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateBankAccountsPublicCache } from "@/lib/redis-cache";

const bodySchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const { orderedIds } = parsed.data;
  const rows = await prisma.bankAccount.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true },
  });
  if (rows.length !== orderedIds.length) {
    return NextResponse.json({ error: "Danh sách ID không khớp tài khoản hiện có" }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      orderedIds.map((id, sortOrder) =>
        prisma.bankAccount.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );
  } catch (e) {
    console.error("[bank-accounts/reorder]", e);
    return NextResponse.json({ error: "Không cập nhật được thứ tự" }, { status: 500 });
  }

  await invalidateBankAccountsPublicCache();

  return NextResponse.json({ ok: true });
}
