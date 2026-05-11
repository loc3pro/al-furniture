/** Giải mã entity phổ biến (server + client). Lặp để xử lý chuỗi bị encode nhiều lớp (vd. &amp;lt;). */
function decodeHtmlEntitiesOnce(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const cp = parseInt(hex, 16);
      if (Number.isNaN(cp)) return _;
      try {
        return String.fromCodePoint(cp);
      } catch {
        return _;
      }
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const cp = parseInt(dec, 10);
      if (Number.isNaN(cp)) return _;
      try {
        return String.fromCodePoint(cp);
      } catch {
        return _;
      }
    })
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function decodeHtmlEntities(input: string): string {
  let prev = "";
  let out = input;
  for (let i = 0; i < 8 && out !== prev; i++) {
    prev = out;
    out = decodeHtmlEntitiesOnce(out);
  }
  return out;
}
