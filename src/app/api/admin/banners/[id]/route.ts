import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { isValidBannerLink, normalizeBannerLink } from "@/lib/banner-link";
import { invalidateActiveBannersCache } from "@/lib/redis-cache";

const patchSchema = z.object({
  imageUrl: z.string().url().optional(),
  link: z.union([z.string(), z.literal(""), z.null()]).optional(),
  title: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
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
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const data = parsed.data;

  let linkVal: string | null | undefined = undefined;
  if (data.link !== undefined) {
    const trimmed = data.link === null || data.link === "" ? "" : String(data.link).trim();
    if (trimmed === "") linkVal = null;
    else {
      const norm = normalizeBannerLink(trimmed);
      if (!isValidBannerLink(norm)) {
        return NextResponse.json({ error: "Link không hợp lệ (dùng /đường-dẫn hoặc https://…)" }, { status: 400 });
      }
      linkVal = norm;
    }
  }

  const updated = await prisma.banner.update({
    where: { id },
    data: {
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      ...(linkVal !== undefined ? { link: linkVal } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.subtitle !== undefined ? { subtitle: data.subtitle } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  });
  await invalidateActiveBannersCache();

  const changed = Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined);
  await recordAdminAudit({
    actorUserId: gate.session.sub,
    action: "ui.banner_update",
    entityType: "Banner",
    entityId: id,
    summary: changed.length > 0 ? `Sửa banner (${changed.join(", ")})` : "Sửa banner",
  });

  return NextResponse.json({ banner: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  await prisma.banner.delete({ where: { id } });
  await invalidateActiveBannersCache();

  await recordAdminAudit({
    actorUserId: gate.session.sub,
    action: "ui.banner_delete",
    entityType: "Banner",
    entityId: id,
    summary: "Xóa banner",
  });

  return NextResponse.json({ ok: true });
}
