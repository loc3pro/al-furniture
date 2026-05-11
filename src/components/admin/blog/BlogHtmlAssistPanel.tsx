"use client";

import { BlogHtmlCheatsheet } from "./BlogHtmlCheatsheet";
import { BlogHtmlPlayground } from "./BlogHtmlPlayground";
import styles from "./BlogHtmlAssistPanel.module.scss";

export function BlogHtmlAssistPanel({
  initialHtml,
  onApplyHtml,
}: {
  initialHtml: string;
  onApplyHtml?: (html: string) => void;
}) {
  return (
    <div className={styles.stack}>
      <BlogHtmlPlayground initialHtml={initialHtml} onApplyHtml={onApplyHtml} />
      <BlogHtmlCheatsheet variant="panel" />
    </div>
  );
}
