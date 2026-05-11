import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { looksLikePhone, normalizeVnPhone } from "@/lib/identifiers";

const patchBody = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(200).optional(),
  avatarUrl: z.string().max(2000).optional().or(z.literal("")),
});

export async function PATCH(req: Request) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { id: gate.session.sub },
    select: { id: true, email: true, googleSub: true, role: true },
  });
  if (!me) {
    return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 404 });
  }

  const d = parsed.data;
  const data: { name?: string; phone?: string | null; email?: string; avatarUrl?: string | null } = {};

  if (d.name !== undefined) data.name = d.name;
  if (d.phone !== undefined) {
    const trimmed = d.phone.trim();
    if (trimmed === "") {
      data.phone = null;
    } else if (looksLikePhone(trimmed)) {
      const norm = normalizeVnPhone(trimmed);
      const taken = await prisma.user.findFirst({
        where: { phone: norm, NOT: { id: me.id } },
      });
      if (taken) {
        return NextResponse.json({ error: "Số điện thoại đã được dùng" }, { status: 409 });
      }
      data.phone = norm;
    } else {
      return NextResponse.json({ error: "Số điện thoại không hợp lệ" }, { status: 400 });
    }
  }
  if (d.email !== undefined) {
    if (me.googleSub) {
      return NextResponse.json(
        { error: "Tài khoản Google/One Tap: không đổi email tại đây" },
        { status: 400 }
      );
    }
    const lower = d.email.toLowerCase();
    const taken = await prisma.user.findFirst({
      where: { email: lower, NOT: { id: me.id } },
    });
    if (taken) {
      return NextResponse.json({ error: "Email đã được dùng" }, { status: 409 });
    }
    data.email = lower;
  }
  if (d.avatarUrl !== undefined) {
    data.avatarUrl = d.avatarUrl === "" ? null : d.avatarUrl;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Không có thay đổi" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: me.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      googleSub: true,
      passwordHash: true,
    },
  });

  if (data.email !== undefined) {
    const token = await createSessionToken({
      sub: updated.id,
      email: updated.email,
      role: updated.role,
    });
    await setSessionCookie(token);
  }

  return NextResponse.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      avatarUrl: updated.avatarUrl,
      linkedGoogle: updated.googleSub != null,
      hasPassword: updated.passwordHash != null,
    },
  });
}
