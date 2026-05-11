import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { maskSecretValue } from "@/lib/managed-keys-mask";
import { adminManagedKeys, type AdminManagedKeyUpdateData } from "@/lib/prisma-admin-managed-keys";

const envKeyField = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(z.string().regex(/^[A-Z][A-Z0-9_]*$/));

const updateBody = z.object({
  label: z.string().min(1).max(120).optional(),
  envKey: envKeyField.optional(),
  value: z.string().min(1).max(8000).optional(),
  description: z.string().max(500).optional().nullable(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = updateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const p = parsed.data;
  const data: AdminManagedKeyUpdateData = {};
  if (p.label !== undefined) data.label = p.label.trim();
  if (p.envKey !== undefined) data.envKey = p.envKey;
  if (p.value !== undefined) data.value = p.value;
  if (p.description !== undefined) data.description = p.description?.trim() ?? null;
  if (p.enabled !== undefined) data.enabled = p.enabled;
  if (p.sortOrder !== undefined) data.sortOrder = p.sortOrder;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Không có trường cập nhật" }, { status: 400 });
  }

  try {
    const row = await adminManagedKeys().update({
      where: { id },
      data,
    });
    return NextResponse.json({
      item: {
        id: row.id,
        label: row.label,
        envKey: row.envKey,
        valueMasked: maskSecretValue(row.value),
        description: row.description,
        enabled: row.enabled,
        sortOrder: row.sortOrder,
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Không cập nhật được" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  try {
    await adminManagedKeys().delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không xóa được" }, { status: 404 });
  }
}
