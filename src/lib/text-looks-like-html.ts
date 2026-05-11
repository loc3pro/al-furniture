/**
 * Heuristic: đoạn có vẻ chứa HTML (admin nhập/dán thẻ), không áp dụng auto-dịch VI→EN.
 * Tránh nhận nhầm "<3" — chỉ match thẻ chữ cái hoặc đóng thẻ.
 */
export function textLooksLikeHtmlFragment(s: string): boolean {
  const t = s.trim();
  if (t.length < 2) return false;
  return /<\/?[a-z][a-z0-9]*(\s|>|\/)/i.test(t);
}
