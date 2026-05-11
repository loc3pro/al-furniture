import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateThemeCache } from "@/lib/redis-cache";

const themeBody = z.object({
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  headerBg: z.string().optional(),
  menuColor: z.string().optional(),
  textOnPrimary: z.string().optional(),
  buttonHoverBg: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  logoDarkUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  brandText: z.string().nullable().optional(),
  headerShowBrandBesideLogo: z.boolean().optional(),
  headerStoreName: z.string().max(120).nullable().optional(),
  footerNote: z.string().nullable().optional(),
  headerHotlineLabel: z.string().max(80).optional(),
  headerHotlinePhone: z.string().max(48).optional(),
  headerShippingLine1: z.string().max(200).optional(),
  headerShippingLine2: z.string().max(200).optional(),
});

export async function PUT(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = themeBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const cleaned = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  );

  const base = {
    id: "default" as const,
    primaryColor: "#2C2620",
    accentColor: "#8B7355",
    headerBg: "#F7F4EF",
    menuColor: "#1A1612",
    textOnPrimary: "#FAF8F5",
    buttonHoverBg: "#EBE5DF",
  };
  await prisma.themeSettings.upsert({
    where: { id: "default" },
    create: { ...base, ...cleaned },
    update: cleaned,
  });

  await invalidateThemeCache();
  /** Để storefront/admin không giữ HTML/CSS variables cũ sau khi lưu theme */
  revalidatePath("/", "layout");

  const keys = Object.keys(cleaned);
  await recordAdminAudit({
    actorUserId: gate.session.sub,
    action: "ui.theme_update",
    entityType: "ThemeSettings",
    entityId: "default",
    summary: keys.length ? `Cập nhật theme (${keys.length} trường)` : "Cập nhật theme",
    metadata: { fields: keys },
  });

  return NextResponse.json({ ok: true });
}
