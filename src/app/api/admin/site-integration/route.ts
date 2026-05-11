import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  apiSettingsSchema,
  cloudSettingsSchema,
  displaySettingsSchema,
  generalSettingsSchema,
  paymentSettingsSchema,
  seoSettingsSchema,
} from "@/lib/site-integration-schema";

const putBody = z.object({
  tab: z.enum(["general", "api", "payment", "cloud", "seo", "display"]),
  payload: z.unknown(),
});

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let row = null;
  try {
    row = await prisma.siteIntegrationSettings.findUnique({ where: { id: "default" } });
  } catch {
    row = null;
  }

  if (!row) {
    return NextResponse.json({
      general: generalSettingsSchema.parse({}),
      api: apiSettingsSchema.parse({}),
      payment: paymentSettingsSchema.parse({ methods: [] }),
      cloud: cloudSettingsSchema.parse({}),
      seo: seoSettingsSchema.parse({}),
      display: displaySettingsSchema.parse({}),
    });
  }

  return NextResponse.json({
    general: row.general,
    api: row.api,
    payment: row.payment,
    cloud: row.cloud,
    seo: row.seo,
    display: row.display,
  });
}

export async function PUT(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = putBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const { tab, payload } = parsed.data;
  const validators = {
    general: generalSettingsSchema,
    api: apiSettingsSchema,
    payment: paymentSettingsSchema,
    cloud: cloudSettingsSchema,
    seo: seoSettingsSchema,
    display: displaySettingsSchema,
  } as const;

  const safe = validators[tab].safeParse(payload);
  if (!safe.success) {
    return NextResponse.json({ error: "Dữ liệu tab không hợp lệ", issues: safe.error.flatten() }, { status: 400 });
  }

  const dataKey = tab as keyof typeof validators;

  try {
    await prisma.siteIntegrationSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        general: dataKey === "general" ? safe.data : {},
        api: dataKey === "api" ? safe.data : {},
        payment: dataKey === "payment" ? safe.data : {},
        cloud: dataKey === "cloud" ? safe.data : {},
        seo: dataKey === "seo" ? safe.data : {},
        display: dataKey === "display" ? safe.data : {},
      },
      update: {
        [dataKey]: safe.data as object,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Không lưu được CSDL" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
