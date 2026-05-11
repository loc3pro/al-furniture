/**
 * Gọi LibreTranslate qua HTTP JSON (tương thích Docker & cloud).
 * Self-host: `docker run -d -p 5000:5000 libretranslate/libretranslate`
 * + `LIBRE_TRANSLATE_URL=http://127.0.0.1:5000`
 */
const CLOUD_TRANSLATE = "https://libretranslate.com/translate";
const REQUEST_MS = 120_000;

/** Tránh Node tới `localhost` → IPv6; Docker Desktop Windows: dùng IPv4. */
export function preferIpv4Localhost(urlStr: string): string {
  const raw = urlStr.trim();
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
    const u = new URL(withProto);
    if (u.hostname === "localhost") u.hostname = "127.0.0.1";
    return u.origin + u.pathname.replace(/\/$/, "");
  } catch {
    return raw.replace(/\/$/, "");
  }
}

function resolveEndpoint(): string {
  const urlEnv = process.env.LIBRE_TRANSLATE_URL?.trim();
  if (urlEnv) {
    const base = preferIpv4Localhost(urlEnv);
    return base.endsWith("/translate") ? base : `${base}/translate`;
  }
  return CLOUD_TRANSLATE;
}

function retryable(e: unknown): boolean {
  const s = e instanceof Error ? `${e.message} ${(e as Error & { cause?: unknown }).cause}` : String(e);
  return /fetch failed|UND_ERR|ECONNRESET|ECONNREFUSED|other side closed|SocketError|timeout/i.test(s);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function postTranslateOnce(
  endpoint: string,
  text: string,
  format: "text" | "html",
): Promise<string> {
  const apiKey = process.env.LIBRE_TRANSLATE_KEY?.trim();
  const body: Record<string, string> = {
    q: text,
    source: "vi",
    target: "en",
    format,
  };
  if (apiKey) body.api_key = apiKey;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_MS),
    cache: "no-store",
  });

  const raw = await res.text();
  let data: { translatedText?: string; error?: string } = {};
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new Error(raw.slice(0, 240) || `LibreTranslate HTTP ${res.status}`);
  }

  if (!res.ok) {
    throw new Error(data.error ?? raw.slice(0, 200) ?? `HTTP ${res.status}`);
  }
  if (data.error) throw new Error(data.error);
  if (typeof data.translatedText !== "string") {
    throw new Error("LibreTranslate: thiếu translatedText");
  }
  return data.translatedText;
}

/** Dịch VI → EN (LibreTranslate HTTP API). `format: html` giữ thẻ, chỉ dịch nội dung chữ. */
export async function translateViToEn(text: string, format: "text" | "html" = "text"): Promise<string> {
  const endpoint = resolveEndpoint();
  try {
    return await postTranslateOnce(endpoint, text, format);
  } catch (e) {
    if (retryable(e)) {
      await sleep(450);
      return await postTranslateOnce(endpoint, text, format);
    }
    throw e;
  }
}
