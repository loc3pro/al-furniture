/**
 * Chromium / một số webview: `showOpenFilePicker` mở được khi `<input type="file">.click()` không.
 * Trình khác trả về "fallback" để gọi `.click()` như cũ.
 */
export type PickLocalImagesResult =
  | { kind: "files"; files: File[] }
  | { kind: "aborted" }
  | { kind: "fallback-input" };

export async function pickLocalImageFiles(maxPick: number): Promise<PickLocalImagesResult> {
  if (typeof window === "undefined") return { kind: "fallback-input" };
  const max = Math.max(1, Math.min(maxPick, 100));

  const w = window as Window & {
    showOpenFilePicker?: (options?: {
      multiple?: boolean;
      types?: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<Array<{ getFile: () => Promise<File> }>>;
  };

  if (typeof w.showOpenFilePicker !== "function") {
    return { kind: "fallback-input" };
  }

  try {
    const handles = await w.showOpenFilePicker({
      multiple: max > 1,
      types: [
        {
          description: "Ảnh",
          accept: {
            "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".heic", ".bmp", ".jfif"],
          },
        },
      ],
    });
    const files: File[] = [];
    for (let i = 0; i < handles.length && files.length < max; i++) {
      files.push(await handles[i].getFile());
    }
    return { kind: "files", files };
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === "AbortError") return { kind: "aborted" };
    return { kind: "fallback-input" };
  }
}
