import sanitizeHtml from "sanitize-html";
import type { IOptions } from "sanitize-html";
import { decodeHtmlEntities } from "@/lib/decode-html-entities";

/**
 * Thuộc tính CSS inline do TinyMCE sinh (căn lề, float ảnh, viền bảng…).
 * Phải khai báo `allowedStyles` — nếu chỉ thêm `style` vào allowedAttributes
 * mà không whitelist thì sanitize-html vẫn loại bỏ giá trị không khớp.
 */
const TINYMCE_ALLOWED_STYLES: NonNullable<IOptions["allowedStyles"]> = {
  "*": {
    "text-align": [/^(?:left|right|center|justify)$/],
    float: [/^(?:left|right|none)$/],
    display: [/^(?:block|inline|inline-block|table|table-row|table-cell)$/],
    width: [/^\d+(?:\.\d+)?(?:px|%|em|rem)$/],
    height: [/^\d+(?:\.\d+)?(?:px|%|em|rem)$/],
    "max-width": [/^\d+(?:\.\d+)?(?:px|%|em|rem)$/],
    "min-width": [/^\d+(?:\.\d+)?(?:px|%|em|rem)$/],
    "border-collapse": [/^(?:collapse|separate)$/],
    "border-spacing": [/^\d+(?:px)?(?:\s+\d+(?:px)?)?$/],
    "vertical-align": [/^(?:top|middle|bottom|baseline|inherit)$/],
    border: [
      /^none$/,
      /^\d+(?:\.\d+)?px\s+(?:solid|dashed|dotted)\s+(#[0-9a-f]{3,8}|rgba?\([^)]+\))$/i,
    ],
    "border-width": [/^(?:\d+(?:\.\d+)?px(?:\s+\d+(?:\.\d+)?px){0,3})$/],
    "border-style": [/^(?:none|solid|dashed|dotted)(?:\s+(?:none|solid|dashed|dotted)){0,3}$/],
    "border-color": [/^(?:#[0-9a-f]{3,8}|rgba?\([^)]+\))$/i],
    padding: [/^\d+(?:\.\d+)?(?:px|em)(?:\s+\d+(?:\.\d+)?(?:px|em)){0,3}$/],
    "padding-left": [/^\d+(?:\.\d+)?(?:px|em)$/],
    "padding-right": [/^\d+(?:\.\d+)?(?:px|em)$/],
    "padding-top": [/^\d+(?:\.\d+)?(?:px|em)$/],
    "padding-bottom": [/^\d+(?:\.\d+)?(?:px|em)$/],
    margin: [
      /^0$/,
      /^(?:\d+(?:\.\d+)?(?:px|em|%)|0|auto)(?:\s+(?:\d+(?:\.\d+)?(?:px|em|%)|0|auto)){0,3}$/,
    ],
    "margin-left": [/^(?:auto|0|\d+(?:\.\d+)?(?:px|em|%))$/],
    "margin-right": [/^(?:auto|0|\d+(?:\.\d+)?(?:px|em|%))$/],
    "margin-top": [/^(?:\d+(?:\.\d+)?(?:px|em|%))$/],
    "margin-bottom": [/^(?:\d+(?:\.\d+)?(?:px|em|%))$/],
    "background-color": [/^transparent$/, /^#[0-9a-f]{3,8}$/i, /^rgba?\([^)]+\)$/],
    color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([^)]+\)$/],
    "font-size": [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
    "line-height": [/^\d+(?:\.\d+)?(?:px|em|rem|%)?$/],
    "object-fit": [/^(?:fill|contain|cover|none)$/],
  },
};

/** HTML hiển thị shop (blog + mô tả SP): admin tin cậy nhưng vẫn lọc script/on* nguy hiểm. */
export function sanitizeShopHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "figure",
      "figcaption",
      "iframe",
      "video",
      "source",
      "span",
      "div",
      "section",
      "article",
      "hr",
      "pre",
      "code",
      "sup",
      "sub",
      "del",
      "ins",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
      "colgroup",
      "col",
      "caption",
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "srcset", "alt", "width", "height", "loading", "decoding", "class", "title"],
      a: ["href", "name", "target", "rel", "class"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "referrerpolicy", "title", "class"],
      video: ["src", "controls", "width", "height", "poster", "class"],
      source: ["src", "type"],
      td: ["colspan", "rowspan", "scope"],
      th: ["colspan", "rowspan", "scope"],
      col: ["span", "width"],
      colgroup: ["span", "width"],
      caption: ["class"],
      /** TinyMCE: căn lề / float / viền bảng → `style`; class (mce-*) giữ layout */
      "*": ["class", "style"],
    },
    allowedStyles: TINYMCE_ALLOWED_STYLES,
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "player.vimeo.com", "www.youtube-nocookie.com"],
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowProtocolRelative: false,
  });
}

/* ================================================================== *
 * HTML structural cleanup — chạy SAU sanitize, áp cho mọi điểm render
 * (blog public, admin preview, mô tả sản phẩm). Mục tiêu: bỏ rác do
 * TinyMCE để lại làm khoảng cách block không nhất quán khi hiển thị.
 * ================================================================== */

const BLOCK_TAGS = "p|h[1-6]|ul|ol|blockquote|pre|figure|hr|table|div|section|article";
const WS_OR_BR = String.raw`(?:\s|&nbsp;|&#160;|<br\s*\/?\s*>)`;

/**
 * Loại các block rỗng / chỉ chứa whitespace / `&nbsp;` / `<br>` (TinyMCE sinh
 * khi user nhấn Enter trống). CSS `:empty` không match nội dung text node, nên
 * phải lọc chuỗi. Lặp đến khi không còn match — phòng thẻ lồng nhau sau khi
 * xóa lớp trong sinh ra rỗng mới.
 */
function stripEmptyBlocks(html: string): string {
  if (!html) return html;
  const empties = new RegExp(`<(p|li|div)\\b[^>]*>${WS_OR_BR}*<\\/\\1>`, "gi");
  let prev = "";
  let next = html;
  while (next !== prev) {
    prev = next;
    next = next.replace(empties, "");
  }
  return next;
}

/**
 * Bỏ `<br>` / whitespace / `&nbsp;` "trôi" giữa 2 block sibling (ví dụ
 * `</p><br><p>`, `</h2>&nbsp;<p>`, `</li><br><li>`). Những node này render
 * ra dòng trắng dư và không thể match từ CSS. Lặp để xử lý chuỗi `<br><br>`.
 */
function stripStrayBlockBreaks(html: string): string {
  if (!html) return html;
  const between = new RegExp(
    `(<\\/(?:${BLOCK_TAGS}|li)>)${WS_OR_BR}+(?=<(?:${BLOCK_TAGS}|li)\\b)`,
    "gi",
  );
  let prev = "";
  let next = html;
  while (next !== prev) {
    prev = next;
    next = next.replace(between, "$1");
  }
  return next;
}

/**
 * Trong `<ul>/<ol>` chỉ cho phép `<li>` làm con trực tiếp. TinyMCE đôi khi
 * chèn text node (`&nbsp;`), `<br>` hoặc cả `<p>` ngay dưới `<ul>` — render
 * ra bullet trống / khoảng trắng to. Bỏ mọi thứ giữa `<ul>` ↔ `<li>` đầu,
 * giữa các `<li>`, và giữa `<li>` cuối ↔ `</ul>`.
 *
 * Không cố parse list lồng nhau bằng regex — vì non-greedy `[\s\S]*?` đủ để
 * gọn các trường hợp một-tầng (đa số TinyMCE output) mà vẫn an toàn với list
 * lồng (chỉ clean lớp bao ngoài cùng được match đầu tiên).
 */
function cleanListContainers(html: string): string {
  if (!html) return html;
  const wsBr = WS_OR_BR;

  // <ul>/<ol> ...rác... <li>  →  <ul>/<ol><li>
  const afterOpen = new RegExp(`(<(?:ul|ol)\\b[^>]*>)${wsBr}+(?=<li\\b)`, "gi");

  // </li> ...rác... <li>  →  </li><li>
  const betweenItems = new RegExp(`(<\\/li>)${wsBr}+(?=<li\\b)`, "gi");

  // </li> ...rác... </ul>/</ol>  →  </li></ul>/</ol>
  const beforeClose = new RegExp(`(<\\/li>)${wsBr}+(?=<\\/(?:ul|ol)>)`, "gi");

  let prev = "";
  let next = html;
  while (next !== prev) {
    prev = next;
    next = next
      .replace(afterOpen, "$1")
      .replace(betweenItems, "$1")
      .replace(beforeClose, "$1");
  }
  return next;
}

/** Pipeline structural cleanup — gộp 3 bước trên. */
function tidyShopHtml(html: string): string {
  if (!html) return html;
  let out = html;
  out = cleanListContainers(out);
  out = stripStrayBlockBreaks(out);
  out = stripEmptyBlocks(out);
  // Một lượt nữa vì xóa block rỗng có thể tạo ra cặp `</p><p>` nay đã liền,
  // nhưng cũng có thể lộ ra `<br>` khác giữa 2 block — chạy lại cho yên tâm.
  out = stripStrayBlockBreaks(out);
  return out;
}

/** Giải mã entity (nếu có) rồi sanitize → tidy — dùng cho dangerouslySetInnerHTML trên storefront. */
export function prepareShopHtmlForRender(html: string): string {
  const decoded = decodeHtmlEntities(html ?? "");
  return tidyShopHtml(sanitizeShopHtml(decoded));
}
