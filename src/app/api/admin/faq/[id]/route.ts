import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";

const updateBody = z.object({
  questionVi: z.string().min(1).max(500).optional(),
  questionEn: z.string().min(1).max(500).optional(),
  answerVi: z.string().min(1).optional(),
  answerEn: z.string().min(1).optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = updateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  try {
    const row = await prisma.faqItem.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ item: row });
  } catch {
    return NextResponse.json({ error: "Không cập nhật được" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  try {
    await prisma.faqItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không xóa được" }, { status: 404 });
  }
}
