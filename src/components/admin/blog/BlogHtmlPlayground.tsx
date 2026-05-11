"use client";

import { useCallback, useMemo, useState } from "react";
import { prepareShopHtmlForRender } from "@/lib/sanitize-shop-html";
import { showAdminToast } from "@/lib/admin-toast";
import styles from "./BlogHtmlPlayground.module.scss";

function detectHtmlRisks(html: string): string[] {
  const msgs: string[] = [];
  const t = html.trim();
  if (!t) return msgs;
  if (/<script[\s>/]/i.test(html)) msgs.push("Thẻ <script> không được phép — bản xem trước đã lọc.");
  if (/on[a-z]+\s*=/i.test(html)) msgs.push("Thuộc tính sự kiện (onclick, onerror, …) không được phép.");
  if (/javascript:/i.test(html)) msgs.push("URL javascript: không được phép.");
  if (/\bvbscript:/i.test(html)) msgs.push("vbscript: không được phép.");
  if (/data:text\/html/i.test(html)) msgs.push("data:text/html thường bị chặn vì bảo mật.");
  const lt = (html.match(/</g) ?? []).length;
  const gt = (html.match(/>/g) ?? []).length;
  if (lt !== gt) msgs.push("Số ký tự < và > không khớp — có thể còn thẻ chưa đóng.");
  return msgs;
}

export function BlogHtmlPlayground({
  initialHtml,
  onApplyHtml,
}: {
  initialHtml: string;
  onApplyHtml?: (html: string) => void;
}) {
  const [draft, setDraft] = useState(initialHtml);
  const previewSafe = useMemo(() => prepareShopHtmlForRender(draft), [draft]);
  const risks = useMemo(() => detectHtmlRisks(draft), [draft]);

  const apply = useCallback(() => {
    if (!onApplyHtml) return;
    const next = prepareShopHtmlForRender(draft);
    onApplyHtml(next);
    showAdminToast("Đã cập nhật nội dung bài từ vùng thử");
  }, [draft, onApplyHtml]);

  return (
    <section className={styles.root} aria-labelledby="blog-html-playground-title">
      <h3 id="blog-html-playground-title" className={styles.title}>
        Thử HTML & so sánh
      </h3>
      <p className={styles.hint}>
        Sửa trực tiếp bên trái; bên phải là bản hiển thị sau khi lọc an toàn (giống trang shop). Di chuột lên ô soạn để xem gợi ý.
      </p>
      {risks.length > 0 ? (
        <div className={styles.alert} role="status" aria-live="polite">
          <strong className={styles.alertTitle}>Lưu ý</strong>
          <ul className={styles.alertList}>
            {risks.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className={styles.split}>
        <div className={styles.col}>
          <label className={styles.label} htmlFor="blog-html-playground-editor">
            Mã HTML (thử)
          </label>
          <textarea
            id="blog-html-playground-editor"
            className={styles.editor}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            title="HTML được lọc an toàn ở cột xem trước — nội dung script / javascript: / onclick… sẽ bị loại khi đăng."
            rows={12}
          />
        </div>
        <div className={styles.col}>
          <span className={styles.label}>Xem trước (đã lọc)</span>
          <div
            className={styles.preview}
            // eslint-disable-next-line react/no-danger -- sanitized for shop
            dangerouslySetInnerHTML={{ __html: previewSafe }}
          />
        </div>
      </div>
      {onApplyHtml ? (
        <div className={styles.actions}>
          <button type="button" className={styles.applyBtn} onClick={() => void apply()}>
            Áp dụng vào nội dung bài
          </button>
        </div>
      ) : null}
    </section>
  );
}
