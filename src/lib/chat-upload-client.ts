/** Upload đính kèm chat với tiến trình (XHR — fetch không có upload progress). */
export function uploadChatAttachment(
  sessionId: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<{ url: string; name: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/chat/session/${sessionId}/upload`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.min(100, Math.round((100 * e.loaded) / e.total)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const d = JSON.parse(xhr.responseText) as { url?: string; name?: string; error?: string };
          if (d.url) {
            resolve({ url: d.url, name: d.name ?? file.name });
          } else {
            reject(new Error(d.error ?? "Upload lỗi"));
          }
        } catch {
          reject(new Error("Phản hồi không hợp lệ"));
        }
      } else {
        try {
          const d = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(d.error ?? `Lỗi ${xhr.status}`));
        } catch {
          reject(new Error(`Lỗi ${xhr.status}`));
        }
      }
    };
    xhr.onerror = () => reject(new Error("Lỗi mạng"));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}
