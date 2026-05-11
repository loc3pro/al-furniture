"use client";

import { useState, type ReactNode } from "react";
import { BlogHtmlAssistPanel } from "@/components/admin/blog/BlogHtmlAssistPanel";
import { BlogHtmlCheatsheet } from "@/components/admin/blog/BlogHtmlCheatsheet";
import { useAdminRightPanelOptional } from "@/components/admin/AdminRightPanel";
import { useMatchMedia } from "@/hooks/useMatchMedia";
import styles from "./AdminHtmlSnippetLauncher.module.scss";

export type AdminHtmlSnippetLauncherAssist = {
  initialHtml: string;
  onApplyHtml?: (html: string) => void;
};

type AdminHtmlSnippetLauncherProps = {
  /** Blog: thử HTML + áp dụng vào bài. SP: không truyền — chỉ bảng gợi ý. */
  assist?: AdminHtmlSnippetLauncherAssist;
};

/** Desktop: mở panel trái gợi ý HTML, giữ nguyên panel phải (form tạo/sửa SP). Mobile: gợi ý dưới nút. */
export function AdminHtmlSnippetLauncher({ assist }: AdminHtmlSnippetLauncherProps) {
  const panel = useAdminRightPanelOptional();
  const wide = useMatchMedia("(min-width: 769px)", false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function buildPanelContent(): ReactNode {
    return assist ? (
      <BlogHtmlAssistPanel initialHtml={assist.initialHtml} onApplyHtml={assist.onApplyHtml} />
    ) : (
      <BlogHtmlCheatsheet variant="panel" />
    );
  }

  function onClick() {
    if (wide && panel) {
      panel.openLeftAssistPanel({
        title: "Gợi ý thẻ HTML",
        content: buildPanelContent(),
      });
      return;
    }
    setMobileOpen((o) => !o);
  }

  return (
    <>
      <button type="button" className={styles.btn} onClick={onClick}>
        {!wide && mobileOpen ? "Ẩn gợi ý HTML" : "Gợi ý HTML"}
      </button>
      {!wide && mobileOpen ? (
        <div className={styles.mobileBlock}>
          {assist ? buildPanelContent() : <BlogHtmlCheatsheet />}
        </div>
      ) : null}
    </>
  );
}
