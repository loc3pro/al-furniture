"use client";

import { memo, useCallback, useMemo, useState } from "react";
import sanitizeHtml from "sanitize-html";
import cls from "./ContentHtmlWorkbench.module.scss";

export type HtmlSuggestionRow = {
  id: string;
  tag: string;
  description: string;
  content: string;
};

export type ContentHtmlWorkbenchProps = {
  suggestions: HtmlSuggestionRow[];
  initialHtml?: string;
  onHtmlChange?: (html: string) => void;
  editorLabel?: string;
};

const sanitizeOpts: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
  allowedAttributes: { a: ["href", "name", "target"], img: ["src", "alt"] },
};

function sanitizePreview(html: string): string {
  return sanitizeHtml(html, sanitizeOpts);
}

/**
 * Gợi ý HTML (bảng) + editor + preview realtime — click dòng cập nhật editor, không đổi layout ngoài vùng scroll nội bộ.
 */
function ContentHtmlWorkbenchInner({
  suggestions,
  initialHtml = "",
  onHtmlChange,
  editorLabel = "Nội dung HTML",
}: ContentHtmlWorkbenchProps) {
  const [html, setHtml] = useState(initialHtml);

  const previewSafe = useMemo(() => sanitizePreview(html), [html]);

  const applyRow = useCallback(
    (content: string) => {
      setHtml(content);
      onHtmlChange?.(content);
    },
    [onHtmlChange],
  );

  const onEditorChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      setHtml(v);
      onHtmlChange?.(v);
    },
    [onHtmlChange],
  );

  return (
    <div className={cls.root}>
      <div className={cls.tableWrap}>
        <table className={cls.table}>
          <thead>
            <tr>
              <th className={cls.th} scope="col">
                Thẻ
              </th>
              <th className={cls.th} scope="col">
                Mô tả
              </th>
              <th className={cls.th} scope="col">
                Nội dung (rút gọn)
              </th>
              <th className={cls.th} scope="col">
                Xem trước
              </th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map((row) => (
              <tr key={row.id}>
                <td className={cls.td}>
                  <button type="button" className={cls.rowButton} onClick={() => applyRow(row.content)}>
                    {row.tag}
                  </button>
                </td>
                <td className={cls.td}>{row.description}</td>
                <td className={cls.td}>
                  <code>{row.content.length > 80 ? `${row.content.slice(0, 80)}…` : row.content}</code>
                </td>
                <td className={cls.td}>
                  <div
                    className={cls.preview}
                    // eslint-disable-next-line react/no-danger -- sanitized
                    dangerouslySetInnerHTML={{ __html: sanitizePreview(row.content) }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={cls.editorRow}>
        <label className="visually-hidden" htmlFor="content-html-workbench-editor">
          {editorLabel}
        </label>
        <textarea
          id="content-html-workbench-editor"
          className={cls.editorTextarea}
          value={html}
          onChange={onEditorChange}
          rows={10}
          aria-label={editorLabel}
        />
        <div className={cls.previewBox}>
          <div
            // eslint-disable-next-line react/no-danger -- sanitized
            dangerouslySetInnerHTML={{ __html: previewSafe }}
          />
        </div>
      </div>
    </div>
  );
}

export const ContentHtmlWorkbench = memo(ContentHtmlWorkbenchInner);

ContentHtmlWorkbench.displayName = "ContentHtmlWorkbench";
