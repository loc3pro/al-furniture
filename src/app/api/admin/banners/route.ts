import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { isValidBannerLink, normalizeBannerLink } from "@/lib/banner-link";
import { invalidateActiveBannersCache } from "@/lib/redis-cache";

export async function GET() {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;
  const list = await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return NextResponse.json({ banners: list });
}

const postSchema = z.object({
  imageUrl: z.string().url(),
  link: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const rawLink = parsed.data.link;
  const trimmed = rawLink == null ? "" : String(rawLink).trim();
  let linkNorm: string | null = null;
  if (trimmed) {
    const norm = normalizeBannerLink(trimmed);
    if (!isValidBannerLink(norm)) {
      return NextResponse.json({ error: "Link không hợp lệ (dùng /đường-dẫn hoặc https://…)" }, { status: 400 });
    }
    linkNorm = norm;
  }

  const maxSo = await prisma.banner.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxSo._max.sortOrder ?? -1) + 1;

  const b = await prisma.banner.create({
    data: {
      imageUrl: parsed.data.imageUrl,
      link: linkNorm,
      title: parsed.data.title ?? null,
      subtitle: parsed.data.subtitle ?? null,
      active: parsed.data.active ?? true,
      sortOrder,
    },
  });
  await invalidateActiveBannersCache();

  await recordAdminAudit({
    actorUserId: gate.session.sub,
    action: "ui.banner_create",
    entityType: "Banner",
    entityId: b.id,
    summary: b.title?.trim() ? `Tạo banner: ${b.title.trim().slice(0, 80)}` : "Tạo banner",
  });

  return NextResponse.json({ banner: b });
}
