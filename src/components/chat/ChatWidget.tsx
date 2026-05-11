"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Paperclip, Send } from "lucide-react";
import { useShopSession } from "@/components/session/ShopSessionProvider";
import { CHAT_AVATAR_STAFF, CHAT_AVATAR_USER, OPEN_CHAT_EVENT } from "@/lib/chat-constants";
import { resolveUserAvatarSrc } from "@/lib/user-avatar";
import { uploadChatAttachment } from "@/lib/chat-upload-client";
import { isChatImageAttachment, isLocalImagePick } from "@/lib/chat-attachment-is-image";
import {
  clipboardMightContainRawImage,
  dataTransferMightContainImages,
  extractImageFilesFromDataTransfer,
} from "@/lib/chat-dnd-images";
import { mergeIncomingImages } from "@/lib/chat-pending-images";
import { pickLocalImageFiles } from "@/lib/chat-open-image-picker";
import {
  CHAT_MAX_FILE_BYTES,
  CHAT_MAX_PENDING_IMAGES,
} from "@/lib/chat-upload-constants";
import dockStyles from "@/components/messaging/MessageFabDock.module.scss";
import { ChatImageLightbox } from "@/components/chat/ChatImageLightbox";
import styles from "./ChatWidget.module.scss";

type Msg = {
  id: string;
  sender: string;
  message: string;
  createdAt: string;
  deletedAt?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
};

type PendingItem =
  | { id: string; file: File; kind: "image"; previewUrl: string }
  | { id: string; file: File; kind: "file" };

function revokePendingPreview(p: PendingItem) {
  if (p.kind === "image") URL.revokeObjectURL(p.previewUrl);
}

/** Tin đang gửi (hiển thị trong luồng — ảnh mờ đến khi refresh xong). */
type OutgoingRow =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "image"; previewUrl: string; progress: number }
  | { id: string; kind: "file"; name: string; progress: number };

function revokeOutgoingRows(rows: OutgoingRow[]) {
  for (const r of rows) {
    if (r.kind === "image") URL.revokeObjectURL(r.previewUrl);
  }
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const LS_LAST_READ = "furniture_chat_last_read_staff";

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function readLastSeen(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_LAST_READ);
}

function writeLastSeen(iso: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_LAST_READ, iso);
}

function seedLastSeenIfNeeded(messages: Msg[]) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(LS_LAST_READ)) return;
  const staff = messages.filter((m) => m.sender === "STAFF");
  const latest = staff.length
    ? staff.reduce((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b))
    : null;
  writeLastSeen(latest ? latest.createdAt : new Date().toISOString());
}

export function ChatWidget() {
  const { user: sessionUser, status: sessionStatus } = useShopSession();
  const [userKey, setUserKey] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState("Bạn");
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [staffUnread, setStaffUnread] = useState(0);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRow[]>([]);
  const [sending, setSending] = useState(false);
  const [imageLightboxSrc, setImageLightboxSrc] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [portalReady, setPortalReady] = useState(false);

  const pendingImageItems = useMemo(
    () =>
      pending.filter((p): p is Extract<PendingItem, { kind: "image" }> => p.kind === "image"),
    [pending],
  );

  const userAvatarSrc = useMemo(
    () => resolveUserAvatarSrc(sessionUser?.avatarUrl, CHAT_AVATAR_USER),
    [sessionUser?.avatarUrl],
  );

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionUser) {
      setUserKey(sessionUser.id);
      const lab = sessionUser.name?.trim() || sessionUser.email || sessionUser.phone || "Bạn";
      setUserLabel(lab);
    } else {
      setUserKey("guest");
      setUserLabel("Bạn");
    }
  }, [sessionStatus, sessionUser]);

  useEffect(() => {
    const openFromEvent = () => setOpen(true);
    window.addEventListener(OPEN_CHAT_EVENT, openFromEvent);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, openFromEvent);
  }, []);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (userKey === null) return;
    let cancelled = false;
    setMessages([]);
    setSessionId(null);
    setStaffUnread(0);
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_LAST_READ);
    }
    void (async () => {
      const res = await fetch("/api/chat/session", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (cancelled || !data.sessionId) return;
      setSessionId(data.sessionId as string);
    })();
    return () => {
      cancelled = true;
    };
  }, [userKey]);

  const markStaffSeen = useCallback(() => {
    writeLastSeen(new Date().toISOString());
    setStaffUnread(0);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  const refresh = useCallback(
    async (sid: string) => {
      const res = await fetch(`/api/chat/session/${sid}/messages`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.messages)) return;

      const list = data.messages as Msg[];
      setMessages(list);
      seedLastSeenIfNeeded(list);

      const sinceStr = readLastSeen() ?? new Date(0).toISOString();
      const since = new Date(sinceStr).getTime();
      const n = list.filter(
        (m: Msg) => m.sender === "STAFF" && new Date(m.createdAt).getTime() > since,
      ).length;

      if (!open) {
        setStaffUnread(n);
      } else {
        setStaffUnread(0);
      }
    },
    [open],
  );

  useEffect(() => {
    if (!sessionId) return;
    void refresh(sessionId);
  }, [sessionId, refresh]);

  useEffect(() => {
    if (!sessionId) return;
    const t = setInterval(() => void refresh(sessionId), 6500);
    return () => clearInterval(t);
  }, [sessionId, refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, outgoing, pending.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (imageLightboxSrc) {
        setImageLightboxSrc(null);
        return;
      }
      closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closePanel, imageLightboxSrc]);

  useEffect(() => {
    if (open && sessionId) {
      markStaffSeen();
      void refresh(sessionId);
    }
  }, [open, sessionId, markStaffSeen, refresh]);

  async function ensureSession() {
    const res = await fetch("/api/chat/session", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.sessionId) {
      setErr("Không tạo được phiên chat");
      return null;
    }
    setSessionId(data.sessionId);
    await refresh(data.sessionId);
    return data.sessionId as string;
  }

  async function openPanel() {
    setOpen(true);
    setErr(null);
    markStaffSeen();
    if (!sessionId) {
      await ensureSession();
    } else {
      await refresh(sessionId);
    }
  }

  async function submitChatMessage(
    sid: string,
    body: { message: string; attachmentUrl?: string; attachmentName?: string },
  ): Promise<boolean> {
    setErr(null);
    const res = await fetch(`/api/chat/session/${sid}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: body.message,
        sender: "USER",
        attachmentUrl: body.attachmentUrl,
        attachmentName: body.attachmentName,
      }),
    });
    if (!res.ok) {
      setErr("Gửi không thành công");
      return false;
    }
    return true;
  }

  function removePending(id: string) {
    setPending((prev) => {
      const victim = prev.find((p) => p.id === id);
      if (victim) revokePendingPreview(victim);
      return prev.filter((p) => p.id !== id);
    });
  }

  const hasPendingImages = pending.some((p) => p.kind === "image");
  const hasPendingFile = pending.some((p) => p.kind === "file");

  function addImagesFromFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) {
      setErr("Chọn ít nhất một ảnh");
      return;
    }
    setPending((prev) => {
      const hadFile = prev.some((p) => p.kind === "file");
      const existingRows = prev
        .filter((p): p is Extract<PendingItem, { kind: "image" }> => p.kind === "image")
        .map((p) => ({ id: p.id, file: p.file, previewUrl: p.previewUrl }));
      const { merged, error } = mergeIncomingImages(existingRows, arr, newId);
      const next: PendingItem[] = merged.map((r) => ({
        id: r.id,
        file: r.file,
        kind: "image" as const,
        previewUrl: r.previewUrl,
      }));
      queueMicrotask(() => {
        if (hadFile) {
          setErr(error ?? "Đã gỡ tệp đính kèm — mỗi lần chỉ ảnh hoặc một tệp.");
        } else {
          setErr(error);
        }
      });
      return next;
    });
  }

  function addDocFile(file: File) {
    if (isLocalImagePick(file)) {
      addImagesFromFiles([file]);
      return;
    }
    if (file.size > CHAT_MAX_FILE_BYTES) {
      setErr(`Tệp tối đa ${CHAT_MAX_FILE_BYTES / (1024 * 1024)}MB`);
      return;
    }
    setPending((prev) => {
      if (prev.some((p) => p.kind === "file")) {
        queueMicrotask(() =>
          setErr("Chỉ một tệp đính kèm (PDF, …) — xóa tệp cũ trước"),
        );
        return prev;
      }
      for (const p of prev) revokePendingPreview(p);
      queueMicrotask(() =>
        setErr(
          prev.some((p) => p.kind === "image")
            ? "Đã gỡ ảnh — chỉ ảnh hoặc một tệp mỗi lần."
            : null,
        ),
      );
      return [{ id: newId(), file, kind: "file" }];
    });
  }

  async function send() {
    if (sending) return;
    const trimmed = text.trim();
    const queue = [...pending];
    if (!trimmed && queue.length === 0) return;

    const rows: OutgoingRow[] = [];
    if (trimmed) rows.push({ id: newId(), kind: "text", text: trimmed });
    for (const q of queue) {
      if (q.kind === "image") {
        rows.push({
          id: q.id,
          kind: "image",
          previewUrl: q.previewUrl,
          progress: 0,
        });
      } else if (q.kind === "file") {
        rows.push({ id: q.id, kind: "file", name: q.file.name, progress: 0 });
      }
    }
    setOutgoing(rows);
    setPending([]);

    setSending(true);
    setErr(null);

    const finishFail = () => {
      revokeOutgoingRows(rows);
      setOutgoing([]);
    };

    try {
      const sid = sessionId ?? (await ensureSession());
      if (!sid) {
        finishFail();
        return;
      }

      const uploaded: { url: string; name: string }[] = [];
      for (const item of queue) {
        const meta = await uploadChatAttachment(sid, item.file, (p) => {
          setOutgoing((prev) =>
            prev.map((r) =>
              r.id === item.id && (r.kind === "image" || r.kind === "file") ? { ...r, progress: Math.round(p) } : r,
            ),
          );
        });
        uploaded.push(meta);
        setOutgoing((prev) =>
          prev.map((r) =>
            r.id === item.id && (r.kind === "image" || r.kind === "file") ? { ...r, progress: 100 } : r,
          ),
        );
      }

      if (trimmed) {
        const ok = await submitChatMessage(sid, { message: trimmed });
        if (!ok) {
          finishFail();
          return;
        }
      }

      for (const meta of uploaded) {
        const ok = await submitChatMessage(sid, {
          message: "",
          attachmentUrl: meta.url,
          attachmentName: meta.name,
        });
        if (!ok) {
          finishFail();
          return;
        }
      }

      revokeOutgoingRows(rows);
      setOutgoing([]);
      setText("");
      await refresh(sid);
    } catch {
      finishFail();
      setErr("Gửi không thành công");
    } finally {
      setSending(false);
    }
  }

  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    addDocFile(file);
  }

  function onImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;
    addImagesFromFiles(list);
  }

  function handleComposerDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.dataTransfer.dropEffect = "copy";
    } catch {
      /* một webview chặn dropEffect */
    }
  }

  function handleComposerDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (sending) return;
    const imgs = extractImageFilesFromDataTransfer(e.dataTransfer);
    if (imgs.length > 0) {
      setErr(null);
      addImagesFromFiles(imgs);
      return;
    }
    if (dataTransferMightContainImages(e.dataTransfer)) {
      setErr(
        "Không đọc được file ảnh từ kéo thả (webview có thể chặn). Thử kéo từ File Explorer, hoặc dán ảnh (Ctrl+V) vào ô nhập, hoặc mở site trong Chrome.",
      );
    }
  }

  async function triggerChooseImages() {
    if (sending) return;
    const remaining = CHAT_MAX_PENDING_IMAGES - pendingImageItems.length;
    if (remaining <= 0) return;
    const res = await pickLocalImageFiles(remaining);
    if (res.kind === "aborted") return;
    if (res.kind === "fallback-input") {
      imageRef.current?.click();
      return;
    }
    addImagesFromFiles(res.files);
  }

  function handleMessagePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const cd = e.clipboardData;
    const imgs = extractImageFilesFromDataTransfer(cd);
    if (imgs.length > 0) {
      e.preventDefault();
      if (sending) return;
      setErr(null);
      addImagesFromFiles(imgs);
      return;
    }
    if (clipboardMightContainRawImage(cd)) {
      e.preventDefault();
      setErr(
        "Có ảnh trong clipboard nhưng webview không trả về file — thử dán trong Chrome, hoặc lưu ảnh rồi kéo từ File Explorer vào khung chat.",
      );
    }
  }

  function renderChatAvatar(staff: boolean) {
    const src = staff ? CHAT_AVATAR_STAFF : userAvatarSrc;
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={36}
        height={36}
        className={styles.avatarMedia}
        loading="lazy"
        decoding="async"
      />
    );
    if (staff) {
      return <span className={styles.avatarRing}>{img}</span>;
    }
    return (
      <span className={styles.avatarWrap} title="Bạn đang trực tuyến">
        <span className={styles.avatarRing}>{img}</span>
        <span className={styles.onlineDot} aria-hidden />
      </span>
    );
  }

  function renderBody(m: Msg) {
    if (m.deletedAt) return <span className={styles.muted}>Tin đã xóa</span>;
    return (
      <>
        {m.message && m.message !== "📎" && m.message !== "📷" ? <div>{m.message}</div> : null}
        {m.attachmentUrl ? (
          isChatImageAttachment(m.attachmentUrl, m.attachmentName) ? (
            <button
              type="button"
              className={styles.attachThumbBtn}
              onClick={() => setImageLightboxSrc(m.attachmentUrl!)}
              aria-label="Xem ảnh phóng to"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.attachmentUrl}
                alt=""
                className={styles.attachThumb}
                loading="lazy"
                decoding="async"
              />
            </button>
          ) : (
            <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className={styles.attachLink}>
              📎 {m.attachmentName || "Tệp"}
            </a>
          )
        ) : null}
      </>
    );
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          className={`${dockStyles.dock} ${styles.fab}`}
          onClick={() => void openPanel()}
          aria-label="Mở chat"
        >
          <span className={styles.fabInner}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static icon in /public */}
            <img
              src="/icon/icon-chat.jpg"
              alt=""
              width={48}
              height={48}
              className={styles.fabIcon}
              aria-hidden
            />
            {staffUnread > 0 ? (
              <span className={`${styles.fabBadge} ${styles.fabBadgePulse}`}>
                {staffUnread > 99 ? "99+" : staffUnread}
              </span>
            ) : null}
          </span>
        </button>
      ) : null}

      {open ? (
        <>
          {portalReady
            ? createPortal(
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    className={styles.fileInputPortal}
                    accept=".pdf,.doc,.docx,.zip,.txt,application/pdf,application/zip"
                    disabled={sending || hasPendingImages}
                    onChange={onFilePick}
                    tabIndex={-1}
                    aria-hidden
                  />
                  <input
                    ref={imageRef}
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={sending}
                    onChange={onImagePick}
                    tabIndex={-1}
                    aria-hidden
                  />
                </>,
                document.body,
              )
            : null}
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Đóng chat"
            onClick={closePanel}
          />
          <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Hộp chat hỗ trợ">
            <div className={styles.head}>
              <div className={styles.headText}>
                <span className={styles.headTitle}>Hỗ trợ</span>
                <span className={styles.headSub}>Chúng tôi phản hồi trong giờ làm việc</span>
              </div>
              <button type="button" className={styles.closeBtn} onClick={closePanel} aria-label="Đóng">
                <span className={styles.closeBtnText}>Đóng</span>
              </button>
            </div>
            <div
              className={styles.thread}
              onDragOver={handleComposerDragOver}
              onDrop={handleComposerDrop}
            >
              <div className={styles.messages}>
                {messages.map((m) => {
                  const staff = m.sender === "STAFF" || m.sender === "SYSTEM";
                  return (
                    <div
                      key={m.id}
                      className={`${styles.msgLane} ${staff ? styles.msgLaneStaff : styles.msgLaneUser}`}
                    >
                      {renderChatAvatar(staff)}
                      <div className={styles.stack}>
                        <span className={styles.senderName}>{staff ? "Hỗ trợ" : userLabel}</span>
                        <div className={`${styles.bubble} ${staff ? styles.bubbleStaff : styles.bubbleUser}`}>
                          {renderBody(m)}
                        </div>
                        <div className={styles.msgMeta}>
                          <span className={styles.msgTime}>{fmtTime(m.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {outgoing.map((o) => (
                  <div
                    key={o.id}
                    className={`${styles.msgLane} ${styles.msgLaneUser} ${styles.outgoingLane}`}
                    aria-live="polite"
                  >
                    {renderChatAvatar(false)}
                    <div className={styles.stack}>
                      <span className={styles.senderName}>{userLabel}</span>
                      <div
                        className={`${styles.bubble} ${styles.bubbleUser} ${o.kind === "text" ? styles.outgoingBubble : ""}`}
                      >
                        {o.kind === "text" ? (
                          <>
                            <div>{o.text}</div>
                            <span className={styles.outgoingHint}>Đang gửi…</span>
                          </>
                        ) : o.kind === "image" ? (
                          <div className={styles.outgoingMedia}>
                            <button
                              type="button"
                              className={styles.outgoingImgHit}
                              onClick={() => setImageLightboxSrc(o.previewUrl)}
                              aria-label="Xem ảnh phóng to"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={o.previewUrl}
                                alt=""
                                className={`${styles.outgoingImg} ${o.progress >= 100 ? styles.outgoingImgUploaded : ""}`}
                              />
                            </button>
                            <div
                              className={
                                o.progress >= 100 ? styles.outgoingShadeDone : styles.outgoingShade
                              }
                            />
                            <div
                              className={
                                o.progress >= 100 ? `${styles.outgoingBadge} ${styles.outgoingBadgeSoft}` : styles.outgoingBadge
                              }
                            >
                              {o.progress < 100 ? `Đang tải ${o.progress}%` : "Đang gửi…"}
                            </div>
                          </div>
                        ) : (
                          <div className={styles.outgoingFileRow}>
                            <span className={styles.outgoingFileIcon} aria-hidden>
                              📎
                            </span>
                            <span className={styles.outgoingFileName}>{o.name}</span>
                            <span className={styles.outgoingFilePct}>
                              {o.progress < 100 ? `${o.progress}%` : "…"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className={styles.msgMeta}>
                        <span className={styles.msgTime}>—</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              {err ? <p className={styles.err}>{err}</p> : null}

              <div className={styles.composerDock}>
                <div className={styles.composerInner}>
                  {pending.length > 0 ? (
                    <>
                      <div className={styles.pendingStrip} aria-label="Đính kèm chờ gửi">
                        {pendingImageItems.length > 0 ? (
                          <div className={styles.pendingImageGrid}>
                            {pendingImageItems.map((p) => (
                              <div key={p.id} className={styles.pendingImageCell}>
                                <button
                                  type="button"
                                  className={styles.pendingZoomBtn}
                                  onClick={() => setImageLightboxSrc(p.previewUrl)}
                                  aria-label="Xem ảnh phóng to"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element -- blob URL trong state */}
                                  <img src={p.previewUrl} alt="" className={styles.pendingImageThumb} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.pendingImageRemove}
                                  onClick={() => removePending(p.id)}
                                  aria-label="Gỡ ảnh"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {hasPendingFile ? (
                          <div className={styles.pendingFileRow}>
                            <span className={styles.pendingFileIcon} aria-hidden>
                              📎
                            </span>
                            <span className={styles.pendingFileName}>
                              {(pending.find((p) => p.kind === "file")?.file.name ?? "").trim() ||
                                "Tệp"}
                            </span>
                            <button
                              type="button"
                              className={styles.pendingRowRemove}
                              onClick={() => {
                                const id = pending.find((p) => p.kind === "file")?.id;
                                if (id) removePending(id);
                              }}
                              aria-label="Gỡ tệp"
                            >
                              ×
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                  <div className={styles.composerBar}>
                    <button
                      type="button"
                      className={`${styles.toolBtn} ${hasPendingImages || sending ? styles.toolBtnDisabled : ""}`}
                      disabled={sending || hasPendingImages}
                      title={
                        hasPendingImages
                          ? "Đang chọn ảnh — không gửi kèm tệp"
                          : "Đính kèm tệp (một tệp — gỡ ảnh nếu chọn)"
                      }
                      aria-label="Đính kèm tệp"
                      onClick={() => {
                        if (sending || hasPendingImages) return;
                        fileRef.current?.click();
                      }}
                    >
                      <Paperclip className={styles.toolBtnIcon} strokeWidth={2.25} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={`${styles.toolBtn} ${sending ? styles.toolBtnDisabled : ""}`}
                      disabled={sending}
                      title={
                        hasPendingFile
                          ? "Chọn ảnh — tệp đính kèm hiện tại sẽ được gỡ"
                          : "Chọn ảnh (tối đa 5)"
                      }
                      aria-label="Chọn ảnh"
                      onClick={() => {
                        void triggerChooseImages();
                      }}
                    >
                      <ImagePlus className={styles.toolBtnIcon} strokeWidth={2.25} aria-hidden />
                    </button>
                    <div className={styles.inputShell}>
                      <input
                        className={styles.inputField}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Nhập tin nhắn…"
                        disabled={sending}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void send();
                          }
                        }}
                        onPaste={handleMessagePaste}
                        aria-label="Nội dung tin nhắn"
                      />
                    </div>
                    <button
                      type="button"
                      className={`${styles.sendIconBtn} ${sending ? styles.sendIconBtnDisabled : ""}`}
                      onClick={() => void send()}
                      disabled={sending || (!text.trim() && pending.length === 0)}
                      aria-label="Gửi"
                    >
                      <Send className={styles.sendIconGlyph} strokeWidth={2.25} aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <ChatImageLightbox src={imageLightboxSrc} onClose={() => setImageLightboxSrc(null)} />
        </>
      ) : null}
    </>
  );
}
