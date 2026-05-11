import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";
import { getShopContentLocale } from "@/lib/shop-content-locale-server";
import type { ContentLocale } from "@/lib/content-locale";

import styles from "./faq.module.scss";

function pickFaqText(locale: ContentLocale, vi: string, en: string): string {
  return locale === "en" ? en : vi;
}

const sanitizeOpts: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
  allowedAttributes: { a: ["href", "name", "target"], img: ["src", "alt"] },
};

export default async function ShopFaqPage() {
  const locale = await getShopContentLocale();
  let items: { id: string; questionVi: string; questionEn: string; answerVi: string; answerEn: string }[] = [];
  try {
    items = await prisma.faqItem.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      select: { id: true, questionVi: true, questionEn: true, answerVi: true, answerEn: true },
    });
  } catch {
    items = [];
  }

  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.h1}>Câu hỏi thường gặp</h1>
      <p className={styles.lead}>Thông tin tham khảo — có thể chứa định dạng HTML đã làm sạch.</p>
      <div className={styles.list}>
        {items.map((it) => {
          const q = pickFaqText(locale, it.questionVi, it.questionEn);
          const raw = pickFaqText(locale, it.answerVi, it.answerEn);
          const html = sanitizeHtml(raw, sanitizeOpts);
          return (
            <details key={it.id} className={styles.details}>
              <summary className={styles.summary}>{q}</summary>
              <div
                className={styles.body}
                // eslint-disable-next-line react/no-danger -- sanitized server-side
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </details>
          );
        })}
      </div>
      {items.length === 0 ? <p className="muted">Chưa có nội dung FAQ.</p> : null}
    </div>
  );
}
