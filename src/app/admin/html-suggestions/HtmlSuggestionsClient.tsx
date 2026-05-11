"use client";

import { memo } from "react";
import { AdminModuleFrame } from "@/design-system/components/AdminModuleFrame";
import { BasePanel } from "@/design-system/components/BasePanel";
import { ContentHtmlWorkbench, type HtmlSuggestionRow } from "@/design-system/components/ContentHtmlWorkbench";

import cls from "./HtmlSuggestionsClient.module.scss";

const SUGGESTIONS: HtmlSuggestionRow[] = [
  {
    id: "h2",
    tag: "h2",
    description: "Tiêu đề phụ",
    content: "<h2>Tiêu đề phụ</h2>",
  },
  {
    id: "p",
    tag: "p",
    description: "Đoạn văn",
    content: "<p>Đoạn mô tả ngắn cho khách.</p>",
  },
  {
    id: "a",
    tag: "a",
    description: "Liên kết",
    content: "<a href=\"/products\">Xem sản phẩm</a>",
  },
];

export const HtmlSuggestionsClient = memo(function HtmlSuggestionsClient() {
  return (
    <AdminModuleFrame header={<h1 className={cls.title}>Gợi ý HTML &amp; xem trước</h1>}>
      <BasePanel
        title="Bảng gợi ý + editor + preview"
        subtitle="Bấm thẻ trong cột đầu để đưa mẫu vào editor; preview cập nhật trong khung cố định — không đẩy layout trang."
      >
        <ContentHtmlWorkbench
          suggestions={SUGGESTIONS}
          initialHtml="<p>Bắt đầu chỉnh sửa hoặc chọn một dòng gợi ý.</p>"
        />
      </BasePanel>
    </AdminModuleFrame>
  );
});
