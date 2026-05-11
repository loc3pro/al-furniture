import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { slugify } from "@/lib/slug";

const patchBody = z.object({
  nameVi: z.string().min(1).max(200).optional(),
  nameEn: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(150).optional(),
  parentId: z.string().nullable().optional(),
  metaTitleVi: z.string().nullable().optional(),
  metaTitleEn: z.string().nullable().optional(),
  metaDescriptionVi: z.string().nullable().optional(),
  metaDescriptionEn: z.string().nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const d = parsed.data;
  const data: Record<string, unknown> = {};
  if (d.nameVi != null) data.nameVi = d.nameVi;
  if (d.nameEn != null) data.nameEn = d.nameEn;
  if (d.slug != null) data.slug = slugify(d.slug);
  if (d.parentId !== undefined) data.parentId = d.parentId;
  if (d.metaTitleVi !== undefined) data.metaTitleVi = d.metaTitleVi?.trim() || null;
  if (d.metaTitleEn !== undefined) data.metaTitleEn = d.metaTitleEn?.trim() || null;
  if (d.metaDescriptionVi !== undefined) data.metaDescriptionVi = d.metaDescriptionVi?.trim() || null;
  if (d.metaDescriptionEn !== undefined) data.metaDescriptionEn = d.metaDescriptionEn?.trim() || null;

  try {
    const cat = await prisma.category.update({
      where: { id },
      data,
    });
    return NextResponse.json({ category: cat });
  } catch {
    return NextResponse.json({ error: "Không cập nhật được" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  try {
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Không xóa được (có sản phẩm / danh mục con?)" },
      { status: 409 },
    );
  }
}
