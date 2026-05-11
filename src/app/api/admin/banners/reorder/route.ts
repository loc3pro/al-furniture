import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { invalidateActiveBannersCache } from "@/lib/redis-cache";

const bodySchema = z.object({
  orderedIds: z.array(z.string().min(8)).min(1),
});

export async function PUT(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const { orderedIds } = parsed.data;
  const rows = await prisma.banner.findMany({ select: { id: true } });
  const set = new Set(rows.map((r) => r.id));
  if (orderedIds.length !== set.size || orderedIds.some((id) => !set.has(id))) {
    return NextResponse.json({ error: "Danh sách thứ tự không khớp banner hiện có" }, { status: 400 });
  }

  await prisma.$transaction(
    orderedIds.map((id, sortOrder) => prisma.banner.update({ where: { id }, data: { sortOrder } })),
  );

  await invalidateActiveBannersCache();

  await recordAdminAudit({
    actorUserId: gate.session.sub,
    action: "ui.banner_reorder",
    entityType: "Banner",
    entityId: null,
    summary: `Đổi thứ tự banner (${orderedIds.length} mục)`,
  });

  return NextResponse.json({ ok: true });
}
