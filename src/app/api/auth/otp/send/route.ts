import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuthPurpose } from "@prisma/client";
import { looksLikeEmail, looksLikePhone, normalizeVnPhone } from "@/lib/identifiers";

const bodySchema = z.object({
  target: z.string().min(3),
  purpose: z.enum(["LOGIN", "REGISTER", "VERIFY_PHONE", "VERIFY_EMAIL"]),
});

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const { target, purpose } = parsed.data;
  const t = target.trim();
  let normalized = t;
  if (looksLikePhone(t)) {
    normalized = normalizeVnPhone(t);
  } else if (looksLikeEmail(t)) {
    normalized = t.toLowerCase();
  } else {
    return NextResponse.json({ error: "Nhập email hoặc SĐT hợp lệ" }, { status: 400 });
  }

  const code = randomCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const purposeEnum = purpose as AuthPurpose;

  await prisma.authVerification.create({
    data: {
      target: normalized,
      purpose: purposeEnum,
      code,
      expiresAt,
    },
  });

  /** Stub gửi SMS / email — production: gọi ESMS / SES */
  console.log(`[OTP] ${normalized} purpose=${purpose} code=${code}`);

  const debug =
    process.env.OTP_DEBUG === "1" || process.env.NODE_ENV === "development"
      ? { code }
      : undefined;

  return NextResponse.json({ ok: true, debug });
}
