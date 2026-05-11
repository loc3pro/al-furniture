"use client";

import { showAdminToast } from "@/lib/admin-toast";
import styles from "./BlogHtmlCheatsheet.module.scss";

type Row = {
  title: string;
  hint: string;
  code: string;
};

const ROWS: Row[] = [
  {
    title: "Đoạn văn",
    hint: "Mỗi đoạn nên nằm trong thẻ <p>. Xuống dòng trong cùng đoạn dùng <br />.",
    code: `<p>Đoạn văn đầu tiên.</p>
<p>Đoạn thứ hai.</p>`,
  },
  {
    title: "In đậm / in nghiêng",
    hint: "Nhấn mạnh từ hoặc cụm từ.",
    code: `<p><strong>In đậm</strong> và <em>in nghiêng</em>.</p>`,
  },
  {
    title: "Tiêu đề nhỏ trong bài",
    hint: "Dùng h2 cho mục lớn, h3 cho mục nhỏ hơn (không nhảy cóc lên h1).",
    code: `<h2>Tiêu đề mục</h2>
<p>Nội dung phía dưới.</p>
<h3>Tiêu đề phụ</h3>`,
  },
  {
    title: "Liên kết",
    hint: "Luôn thêm https:// cho địa chỉ web.",
    code: `<p>Xem thêm <a href="https://example.com" target="_blank" rel="noopener noreferrer">tại đây</a>.</p>`,
  },
  {
    title: "Danh sách",
    hint: "ul = bullet, ol = số thứ tự; mỗi dòng là một <li>.",
    code: `<ul>
  <li>Mục một</li>
  <li>Mục hai</li>
</ul>`,
  },
  {
    title: "Ảnh",
    hint: "Dán URL ảnh đã tải lên (Cloudinary…). Luôn có mô tả ngắn trong alt.",
    code: `<p><img src="https://…" alt="Mô tả ảnh" width="800" height="500" loading="lazy" /></p>`,
  },
  {
    title: "Trích dẫn",
    hint: "Khối trích dẫn hoặc lời thoại.",
    code: `<blockquote>
  <p>Câu trích dẫn hoặc nhận xét.</p>
</blockquote>`,
  },
];

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    showAdminToast("Đã sao chép vào clipboard");
  } catch {
    showAdminToast("Không sao chép được — thử chọn tay trong ô mẫu", "error");
  }
}

export function BlogHtmlCheatsheet({ variant = "default" }: { variant?: "default" | "panel" }) {
  return (
    <aside
      className={variant === "panel" ? `${styles.wrap} ${styles.wrapPanel}` : styles.wrap}
      aria-label="Gợi ý thẻ HTML"
    >
      <p className={styles.intro}>
        Bật chế độ này khi bạn muốn dùng HTML trong nội dung. Dưới đây là các thẻ thường gặp — nhấn{" "}
        <strong>Sao chép</strong> rồi dán vào ô nội dung và sửa cho đúng ý bạn.
      </p>
      <ul className={styles.grid}>
        {ROWS.map((row) => (
          <li key={row.title} className={styles.card}>
            <div className={styles.cardHead}>
              <h3 className={styles.cardTitle}>{row.title}</h3>
              <button type="button" className={styles.copyBtn} onClick={() => void copyText(row.code)}>
                Sao chép
              </button>
            </div>
            <p className={styles.hint}>{row.hint}</p>
            <pre className={styles.code}>
              <code>{row.code}</code>
            </pre>
          </li>
        ))}
      </ul>
    </aside>
  );
}
