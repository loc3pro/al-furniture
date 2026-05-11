import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { translateViToEn } from "@/lib/translate-libre";
import { textLooksLikeHtmlFragment } from "@/lib/text-looks-like-html";
import { getCachedTranslation, setCachedTranslation, translateCacheMaterial, type TranslateFormat } from "@/lib/translate-vi-en";

const bodySchema = z.object({
  text: z.string().max(50_000),
  /** `auto`: có thẻ HTML → dịch theo chế độ html (giữ thẻ). */
  format: z.enum(["text", "html", "auto"]).optional().default("auto"),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const raw = parsed.data.text;
  const trimmed = raw.trim();

  if (!trimmed) {
    return NextResponse.json({ translated: "" });
  }

  const resolvedFormat: TranslateFormat =
    parsed.data.format === "auto"
      ? textLooksLikeHtmlFragment(trimmed)
        ? "html"
        : "text"
      : parsed.data.format === "html"
        ? "html"
        : "text";

  const cacheMaterial = translateCacheMaterial(raw, resolvedFormat);
  const cached = await getCachedTranslation(cacheMaterial);
  if (cached !== null) {
    return NextResponse.json({ translated: cached });
  }

  const apiKey = process.env.LIBRE_TRANSLATE_KEY?.trim();
  const customUrl = process.env.LIBRE_TRANSLATE_URL?.trim();
  /** API cloud https://libretranslate.com bắt buộc có key; URL riêng (Docker) có thể không cần. */
  if (!customUrl && !apiKey) {
    return NextResponse.json(
      {
        error:
          "Chưa cấu hình dịch: thêm LIBRE_TRANSLATE_KEY vào .env (đăng ký tại https://portal.libretranslate.com) hoặc LIBRE_TRANSLATE_URL nếu tự host LibreTranslate.",
      },
      { status: 503 },
    );
  }

  try {
    const translated = await translateViToEn(trimmed, resolvedFormat);
    await setCachedTranslation(cacheMaterial, translated);
    return NextResponse.json({ translated });
  } catch (e) {
    console.error("[api/translate]", e);
    const msg = e instanceof Error ? e.message : String(e);
    const human =
      /api key|portal\.libretranslate/i.test(msg) || msg.includes("LIBRE_TRANSLATE")
        ? "LibreTranslate từ chối: kiểm tra LIBRE_TRANSLATE_KEY hoặc LIBRE_TRANSLATE_URL trong .env."
        : /fetch failed|ECONNREFUSED|ECONNRESET|socket|UND_ERR_SOCKET|other side closed/i.test(msg)
          ? "Không kết nối được LibreTranslate — chạy Docker (`docker start libretranslate`) và đặt LIBRE_TRANSLATE_URL=http://127.0.0.1:5000"
          : "Không dịch được (LibreTranslate)";
    return NextResponse.json({ error: human }, { status: 502 });
  }
}
