import { isLocalImagePick } from "@/lib/chat-attachment-is-image";

/** Gom ảnh từ DataTransfer (kéo thả / dán): dùng cả .files và .items — webview đôi khi chỉ điền một trong hai. */
export function extractImageFilesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const out: File[] = [];
  const seen = new Set<string>();

  function consider(f: File | null) {
    if (!f || f.size <= 0) return;
    const t = (f.type || "").toLowerCase();
    if (!t.startsWith("image/") && !isLocalImagePick(f)) return;
    const k = `${f.name}:${f.size}:${f.lastModified}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(f);
  }

  if (dt.files?.length) {
    for (let i = 0; i < dt.files.length; i++) consider(dt.files[i]);
  }

  if (dt.items?.length) {
    for (let i = 0; i < dt.items.length; i++) {
      const it = dt.items[i];
      if (it.kind === "file") consider(it.getAsFile());
      const ty = (it.type || "").toLowerCase();
      if (ty.startsWith("image/")) consider(it.getAsFile());
    }
  }

  return out;
}

export function dataTransferMightContainImages(dt: DataTransfer | null): boolean {
  if (!dt?.types) return false;
  for (let i = 0; i < dt.types.length; i++) {
    const x = dt.types[i].toLowerCase();
    if (x === "files") return true;
    if (x.includes("image")) return true;
  }
  return false;
}

export function clipboardMightContainRawImage(dt: DataTransfer | null): boolean {
  if (!dt?.items?.length) return false;
  for (let i = 0; i < dt.items.length; i++) {
    const ty = (dt.items[i].type || "").toLowerCase();
    if (ty.startsWith("image/")) return true;
  }
  return false;
}
