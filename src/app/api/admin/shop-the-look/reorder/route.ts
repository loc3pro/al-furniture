import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { invalidateHomeSectionsCache } from "@/lib/redis-cache";

const bodySchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

/** Gán lại sortOrder 0..n theo thứ tự mảng `orderedIds`. */
export async function POST(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const { orderedIds } = parsed.data;
  const unique = new Set(orderedIds);
  if (unique.size !== orderedIds.length) {
    return NextResponse.json({ error: "Trùng id trong danh sách" }, { status: 400 });
  }

  const existing = await prisma.shopTheLook.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true },
  });
  if (existing.length !== orderedIds.length) {
    return NextResponse.json({ error: "Một số bài không tồn tại" }, { status: 400 });
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.shopTheLook.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  await invalidateHomeSectionsCache();
  return NextResponse.json({ ok: true });
}
