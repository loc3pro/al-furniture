const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

export function normalizeVnPhone(input: string) {
  const s = input.replace(/\s+/g, "");
  if (s.startsWith("+84")) return s;
  if (s.startsWith("0")) return `+84${s.slice(1)}`;
  return s;
}

export function looksLikePhone(s: string) {
  const t = s.trim();
  return PHONE_RE.test(normalizeVnPhone(t)) || /^\d{9,12}$/.test(t.replace(/\D/g, ""));
}

export function looksLikeEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
