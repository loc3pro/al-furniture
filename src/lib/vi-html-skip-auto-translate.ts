/**
 * Phát hiện nội dung VI dạng HTML “có cấu trúc” (bảng, ảnh, nhúng, form…)
 * — không nên đưa qua API dịch máy (dễ hỏng thẻ / không cần dịch khi đã HTML).
 * Thẻ kiểu `<p>`, `<strong>`, `<h2>`… (soạn WYSIWYG thường) vẫn cho phép dịch.
 */
const STRUCTURAL_OR_EMBED_TAG_RE =
  /<\s*(?:table|thead|tbody|tr|td|th|img|iframe|video|svg|form|input|button|select|textarea|style|script|link|meta|picture|source|canvas|map|object|embed|figure|footer|header|nav|section|article|aside|colgroup|col|template|pre|code)\b/i;

export function viHtmlShouldSkipAutoTranslate(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  return STRUCTURAL_OR_EMBED_TAG_RE.test(t);
}
