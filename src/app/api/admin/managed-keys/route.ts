import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { maskSecretValue } from "@/lib/managed-keys-mask";
import { adminManagedKeys, type AdminManagedKeyRecord } from "@/lib/prisma-admin-managed-keys";

const createBody = z.object({
  label: z.string().min(1).max(120),
  envKey: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .pipe(z.string().regex(/^[A-Z][A-Z0-9_]*$/, "Chỉ A–Z, số và _; bắt đầu bằng chữ")),
  value: z.string().min(1).max(8000),
  description: z.string().max(500).optional().nullable(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let rows: AdminManagedKeyRecord[] = [];
  try {
    rows = await adminManagedKeys().findMany({ orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }] });
  } catch {
    rows = [];
  }

  return NextResponse.json({
    items: rows.map((r: AdminManagedKeyRecord) => ({
      id: r.id,
      label: r.label,
      envKey: r.envKey,
      valueMasked: maskSecretValue(r.value),
      description: r.description,
      enabled: r.enabled,
      sortOrder: r.sortOrder,
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = createBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const row = await adminManagedKeys().create({
      data: {
        label: parsed.data.label.trim(),
        envKey: parsed.data.envKey,
        value: parsed.data.value,
        description: parsed.data.description?.trim() || null,
        enabled: parsed.data.enabled ?? true,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
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
    return NextResponse.json({ error: "Không tạo được (trùng envKey?)" }, { status: 400 });
  }
}
