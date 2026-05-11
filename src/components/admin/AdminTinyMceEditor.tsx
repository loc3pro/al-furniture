"use client";

import { Editor } from "@tinymce/tinymce-react";
import { useId, useMemo } from "react";
import styles from "./AdminTinyMceEditor.module.scss";

const TINYMCE_VER = "8.5.0";
const CDN_SCRIPT = `https://cdn.jsdelivr.net/npm/tinymce@${TINYMCE_VER}/tinymce.min.js`;
const CDN_BASE = `https://cdn.jsdelivr.net/npm/tinymce@${TINYMCE_VER}`;
const VI_LANG = "https://cdn.jsdelivr.net/npm/tinymce-i18n/langs8/vi.js";

export type AdminTinyMceEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  /** Chiều cao vùng soạn (px) */
  minHeight?: number;
  /** Placeholder khi rỗng */
  placeholder?: string;
};

export function AdminTinyMceEditor({
  value,
  onChange,
  disabled,
  minHeight = 420,
  placeholder = "Soạn nội dung hoặc chuyển sang Mã HTML (toolbar) để dán thẻ…",
}: AdminTinyMceEditorProps) {
  const reactId = useId();
  const editorId = useMemo(() => `tmce-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`, [reactId]);

  const init = useMemo(
    () => ({
      base_url: CDN_BASE,
      suffix: ".min",
      height: minHeight,
      menubar: false,
      branding: false,
      promotion: false,
      language: "vi",
      language_url: VI_LANG,
      placeholder,
      forced_root_block: "p",
      newline_behavior: "default" as const,
      block_formats: "Paragraph=p; Heading 2=h2; Heading 3=h3; Preformatted=pre",
      plugins: [
        "advlist",
        "autolink",
        "lists",
        "link",
        "image",
        "charmap",
        "anchor",
        "searchreplace",
        "visualblocks",
        "code",
        "fullscreen",
        "insertdatetime",
        "media",
        "table",
        "help",
        "wordcount",
      ].join(" "),
      toolbar:
        "undo redo | blocks | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | " +
        "bullist numlist outdent indent | link image table | code fullscreen | removeformat | help",
      content_style:
        "body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; font-size: 15px; line-height: 1.6; margin: 12px; }",
      skin: "oxide",
      content_css: "default",
    }),
    [minHeight, placeholder],
  );

  return (
    <div className={styles.wrap} data-disabled={disabled ? "true" : undefined}>
      <Editor
        licenseKey="gpl"
        id={editorId}
        tinymceScriptSrc={CDN_SCRIPT}
        value={value}
        onEditorChange={(content) => onChange(content)}
        disabled={disabled}
        init={init}
      />
    </div>
  );
}
