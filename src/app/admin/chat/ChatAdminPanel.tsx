"use client";

import { ImagePlus, Paperclip, Send } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { CHAT_AVATAR_USER } from "@/lib/chat-constants";
import { resolveUserAvatarSrc } from "@/lib/user-avatar";
import { isChatImageAttachment, isLocalImagePick } from "@/lib/chat-attachment-is-image";
import { uploadChatAttachment } from "@/lib/chat-upload-client";
import {
  clipboardMightContainRawImage,
  dataTransferMightContainImages,
  extractImageFilesFromDataTransfer,
} from "@/lib/chat-dnd-images";
import { mergeIncomingImages } from "@/lib/chat-pending-images";
import { pickLocalImageFiles } from "@/lib/chat-open-image-picker";
import { CHAT_MAX_FILE_BYTES, CHAT_MAX_PENDING_IMAGES } from "@/lib/chat-upload-constants";
import { ChatImageLightbox } from "@/components/chat/ChatImageLightbox";
import { AdminBackButton } from "@/components/admin/AdminBackNav";
import styles from "./AdminChat.module.scss";

type SessionRow = {
  id: string;
  status: string;
  guestKey: string | null;
  user: {
    email: string | null;
    phone: string | null;
    name: string | null;
    avatarUrl: string | null;
  } | null;
  lastMessage: string | null;
  updatedAt: string;
  /** Tin khách (USER) gần nhất — dùng để sort danh sách */
  sortAt: string;
  unreadCount: number;
};

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

type OutgoingRow =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "image"; previewUrl: string; progress: number }
  | { id: string; kind: "file"; name: string; progress: number };

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function revokeOutgoingRows(rows: OutgoingRow[]) {
  for (const r of rows) {
    if (r.kind === "image") URL.revokeObjectURL(r.previewUrl);
  }
}

/** Giờ dưới bubble — cùng kiểu hình mẫu (12h). */
function fmtChatMessageTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

/** Cột phải danh sách phiên — tương đối gần giống inbox. */
function formatRelativeSessionTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "Vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ngày`;
  try {
    return new Date(iso).toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function lastUserActivityMs(messages: Msg[], sortAtIso: string | undefined): number {
  const fromSort = sortAtIso ? new Date(sortAtIso).getTime() : 0;
  const userTimes = messages
    .filter((m) => m.sender === "USER" && !m.deletedAt)
    .map((m) => new Date(m.createdAt).getTime())
    .filter((x) => Number.isFinite(x));
  const fromMsgs = userTimes.length > 0 ? Math.max(...userTimes) : 0;
  return Math.max(fromSort, fromMsgs);
}

const CHAT_NARROW_MAX_PX = 900;

const SESSION_LIST_FETCH_LIMIT = 400;

function sessionMatchesQuery(s: SessionRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const label = (s.user?.name || s.user?.email || s.user?.phone || `Khách ${s.id.slice(-6)}`).toLowerCase();
  const preview = (s.lastMessage ?? "").toLowerCase();
  const idTail = s.id.toLowerCase();
  return label.includes(needle) || preview.includes(needle) || idTail.includes(needle);
}

export function ChatAdminPanel() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const activeSessionRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("Nhân viên");
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingRow[]>([]);
  const [sending, setSending] = useState(false);
  const [imageLightboxSrc, setImageLightboxSrc] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [sessionQuery, setSessionQuery] = useState("");
  /** SSR = không narrow; cập nhật sau mount (khớp useSyncExternalStore getServerSnapshot=false). */
  const [narrowChat, setNarrowChat] = useState(false);

  activeSessionRef.current = active;

  useLayoutEffect(() => {
    const mq = window.matchMedia(`(max-width: ${CHAT_NARROW_MAX_PX}px)`);
    const apply = () => setNarrowChat(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const pendingImageItems = useMemo(
    () => pending.filter((p): p is Extract<PendingItem, { kind: "image" }> => p.kind === "image"),
    [pending],
  );

  const filteredSessions = useMemo(
    () => sessions.filter((s) => sessionMatchesQuery(s, sessionQuery)),
    [sessions, sessionQuery],
  );

  const customerLabel = useMemo(() => {
    if (!active) return "";
    const s = sessions.find((x) => x.id === active);
    if (!s) return "Khách";
    return s.user?.name?.trim() || s.user?.email || s.user?.phone || `Khách ${s.id.slice(-6)}`;
  }, [active, sessions]);

  const customerAvatarSrc = useMemo(() => {
    if (!active) return CHAT_AVATAR_USER;
    const s = sessions.find((x) => x.id === active);
    return resolveUserAvatarSrc(s?.user?.avatarUrl, CHAT_AVATAR_USER);
  }, [active, sessions]);

  const activeSessionSortAt = useMemo(() => sessions.find((x) => x.id === active)?.sortAt, [active, sessions]);

  const customerLikelyOnline = useMemo(() => {
    if (!active) return false;
    const ref = lastUserActivityMs(messages, activeSessionSortAt);
    if (!ref) return false;
    return Date.now() - ref < ONLINE_WINDOW_MS;
  }, [active, messages, activeSessionSortAt]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const u = d.user;
        if (u?.name?.trim()) setAdminName(u.name.trim());
        else if (u?.email) setAdminName(u.email);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSessions = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/admin/chat/sessions?limit=${SESSION_LIST_FETCH_LIMIT}`, {
        credentials: "same-origin",
        signal,
      });
      const data = await res.json().catch(() => ({}));
      if (signal?.aborted) return;
      if (res.ok && Array.isArray(data.sessions)) {
        const rows = [...(data.sessions as SessionRow[])].sort((a, b) => {
          const ka = new Date(a.sortAt ?? a.updatedAt).getTime();
          const kb = new Date(b.sortAt ?? b.updatedAt).getTime();
          return kb - ka;
        });
        setSessions(rows);
        if (typeof data.totalUnread === "number") setTotalUnread(data.totalUnread);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }, []);

  const loadMessages = useCallback(async (id: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/chat/session/${id}/messages`, {
        credentials: "same-origin",
        signal,
      });
      const data = await res.json().catch(() => ({}));
      if (signal?.aborted) return;
      if (activeSessionRef.current !== id) return;
      if (res.ok && Array.isArray(data.messages)) setMessages(data.messages as Msg[]);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }, []);

  useEffect(() => {
    let currentAc: AbortController | null = null;
    const run = () => {
      currentAc?.abort();
      currentAc = new AbortController();
      void loadSessions(currentAc.signal);
    };
    run();
    const t = setInterval(run, 12_000);
    return () => {
      clearInterval(t);
      currentAc?.abort();
    };
  }, [loadSessions]);

  useEffect(() => {
    if (!active) return;
    let currentAc: AbortController | null = null;
    const run = () => {
      currentAc?.abort();
      currentAc = new AbortController();
      void loadMessages(active, currentAc.signal);
    };
    run();
    const t = setInterval(run, 6500);
    return () => {
      clearInterval(t);
      currentAc?.abort();
    };
  }, [active, loadMessages]);

  useEffect(() => {
    if (!active) return;
    setPending((prev) => {
      for (const p of prev) revokePendingPreview(p);
      return [];
    });
    setOutgoing([]);
    setText("");
  }, [active]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, outgoing, active, pending.length]);

  async function submitStaffMessage(body: {
    message: string;
    attachmentUrl?: string;
    attachmentName?: string;
  }): Promise<boolean> {
    if (!active) return false;
    setErr(null);
    const res = await fetch(`/api/chat/session/${active}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        sender: "STAFF",
        message: body.message,
        attachmentUrl: body.attachmentUrl,
        attachmentName: body.attachmentName,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr((j as { error?: string }).error ?? "Không gửi được");
      return false;
    }
    return true;
  }

  const hasPendingImages = pending.some((p) => p.kind === "image");
  const hasPendingFile = pending.some((p) => p.kind === "file");

  function removePending(id: string) {
    setPending((prev) => {
      const victim = prev.find((p) => p.id === id);
      if (victim) revokePendingPreview(victim);
      return prev.filter((p) => p.id !== id);
    });
  }

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

  async function sendStaff() {
    if (sending || !active) return;
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
      const uploaded: { url: string; name: string }[] = [];
      for (const item of queue) {
        const meta = await uploadChatAttachment(active, item.file, (p) => {
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
        const ok = await submitStaffMessage({ message: trimmed });
        if (!ok) {
          finishFail();
          return;
        }
      }

      for (const meta of uploaded) {
        const ok = await submitStaffMessage({
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
      await loadMessages(active);
      await loadSessions();
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
      /* webview */
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
        "Không đọc được file ảnh từ kéo thả (webview có thể chặn). Thử kéo từ File Explorer, hoặc dán ảnh (Ctrl+V) vào ô nhập, hoặc mở trang trong Chrome.",
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

  function selectSession(id: string, prevUnread: number) {
    setActive(id);
    setSessions((prev) => prev.map((x) => (x.id === id ? { ...x, unreadCount: 0 } : x)));
    setTotalUnread((t) => Math.max(0, t - prevUnread));
    void fetch(`/api/admin/chat/session/${id}/read`, {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});
  }

  function renderAttachment(m: Msg) {
    if (!m.attachmentUrl) return null;
    if (isChatImageAttachment(m.attachmentUrl, m.attachmentName)) {
      return (
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
      );
    }
    return (
      <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className={styles.attachLink}>
        📎 {m.attachmentName || "Tệp đính kèm"}
      </a>
    );
  }

  function bubbleContent(m: Msg) {
    if (m.deletedAt) {
      return <span className={styles.bubbleMuted}>Tin nhắn đã xóa</span>;
    }
    return (
      <>
        {m.message && m.message !== "📎" ? <div>{m.message}</div> : null}
        {renderAttachment(m)}
      </>
    );
  }

  const gridClassName = `${styles.grid}${
    narrowChat ? (active ? ` ${styles.gridNarrowThread}` : ` ${styles.gridNarrowList}`) : ""
  }`;

  return (
    <AdminPageLayout
      scrollClassName={styles.chatScroll}
      header={
        <AdminStickyPageHeader>
          <header className={styles.header}>
            <h1 className={styles.title}>Chat khách</h1>
            <p className={styles.subline}>
              {totalUnread > 0 ? (
                <span className={styles.unreadStrong}>{totalUnread} tin chờ phản hồi</span>
              ) : (
                <span>Không có tin chờ</span>
              )}
              <span aria-hidden>·</span>
              <span>Polling ~8s / 4s</span>
            </p>
          </header>
        </AdminStickyPageHeader>
      }
    >
      <div className={styles.chatPageBody}>
        <div className={gridClassName}>
        <aside className={styles.sessionsCard}>
          <div className={styles.sessionsHead}>Phiên hội thoại</div>
          <div className={styles.sessionSearchWrap}>
            <input
              type="search"
              className={styles.sessionSearchInput}
              value={sessionQuery}
              onChange={(e) => setSessionQuery(e.target.value)}
              placeholder="Tìm phiên, email, SĐT…"
              aria-label="Lọc danh sách phiên chat"
              autoComplete="off"
            />
          </div>
          <ul className={styles.sessionList}>
            {sessions.length === 0 ? (
              <li className={styles.sessionEmpty}>Chưa có phiên nào.</li>
            ) : filteredSessions.length === 0 ? (
              <li className={styles.sessionEmpty}>Không khớp “{sessionQuery.trim()}”.</li>
            ) : (
              filteredSessions.map((s) => {
                const label = s.user?.name || s.user?.email || s.user?.phone || `Khách ${s.id.slice(-6)}`;
                const listAvatar = resolveUserAvatarSrc(s.user?.avatarUrl, CHAT_AVATAR_USER);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => selectSession(s.id, s.unreadCount)}
                      className={`${styles.sessionBtn} ${active === s.id ? styles.sessionActive : ""}`}
                    >
                      <div className={styles.sessionBtnInner}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <span className={styles.sessionListAvatar}>
                          <img src={listAvatar} alt="" width={40} height={40} />
                        </span>
                        <div className={styles.sessionMain}>
                          <div className={styles.sessionRow}>
                            <span className={styles.sessionName}>{label}</span>
                            <span className={styles.sessionTime}>{formatRelativeSessionTime(s.sortAt)}</span>
                          </div>
                          <div className={styles.sessionRowMeta}>
                            <span className={styles.sessionPreview}>{s.lastMessage ?? "—"}</span>
                            {s.unreadCount > 0 ? (
                              <span className={styles.sessionBadge}>{s.unreadCount}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <div className={styles.threadGridCell}>
          {narrowChat && active ? (
            <div className={styles.threadMobileBackBarOuter}>
              <AdminBackButton onClick={() => setActive(null)}>Danh sách</AdminBackButton>
            </div>
          ) : null}
          <section className={styles.threadCard}>
          {!active ? (
            <p className={styles.threadEmpty}>Chọn một phiên bên trái để xem và trả lời.</p>
          ) : (
            <div
              className={styles.threadInner}
              onDragOver={handleComposerDragOver}
              onDrop={handleComposerDrop}
            >
              {narrowChat ? (
                <div className={styles.threadMobileCustomerBar}>
                  <span className={styles.threadMobileTitle}>{customerLabel}</span>
                  <span className={styles.threadMobileStatus}>
                    <span
                      className={
                        customerLikelyOnline ? styles.statusDotOnline : styles.statusDotOffline
                      }
                      aria-hidden
                    />
                    {customerLikelyOnline ? "Đang hoạt động" : "Không hoạt động"}
                  </span>
                </div>
              ) : (
                <div className={styles.threadDeskHeader}>
                  <div className={styles.threadHeaderAvatar}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={customerAvatarSrc} alt="" width={48} height={48} />
                  </div>
                  <div className={styles.threadHeaderMeta}>
                    <div className={styles.threadHeaderName}>{customerLabel}</div>
                    <div className={styles.threadHeaderStatus}>
                      <span
                        className={
                          customerLikelyOnline ? styles.statusDotOnline : styles.statusDotOffline
                        }
                        aria-hidden
                      />
                      <span
                        className={
                          customerLikelyOnline ? styles.statusTextOnline : styles.statusTextOffline
                        }
                      >
                        {customerLikelyOnline ? "Đang hoạt động" : "Không hoạt động"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {active ? (
                <div className={styles.fileInputsHost} aria-hidden>
                  <input
                    ref={fileRef}
                    type="file"
                    className={styles.fileInputHidden}
                    accept=".pdf,.doc,.docx,.zip,.txt,application/pdf,application/zip"
                    disabled={sending || hasPendingImages}
                    onChange={onFilePick}
                    tabIndex={-1}
                    aria-hidden
                  />
                  <input
                    ref={imageRef}
                    type="file"
                    className={styles.fileInputHidden}
                    accept="image/*"
                    multiple
                    disabled={sending}
                    onChange={onImagePick}
                    tabIndex={-1}
                    aria-hidden
                  />
                </div>
              ) : null}
              <div className={styles.messagesWrap}>
                {messages.map((m) => {
                  const staff = m.sender === "STAFF" || m.sender === "SYSTEM";
                  return (
                    <div
                      key={m.id}
                      className={`${styles.msgLane} ${staff ? styles.msgLaneStaff : styles.msgLaneUser}`}
                    >
                      {!staff ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <span className={styles.avatarRing}>
                          <img
                            src={customerAvatarSrc}
                            alt=""
                            width={36}
                            height={36}
                            className={styles.avatarMedia}
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                      ) : null}
                      <div className={styles.msgStack}>
                        {!staff ? <span className={styles.senderName}>{customerLabel}</span> : null}
                        <div className={`${styles.bubble} ${staff ? styles.bubbleStaff : styles.bubbleUser}`}>
                          {bubbleContent(m)}
                        </div>
                        <div className={styles.msgFooter}>
                          <span className={styles.msgTime}>{fmtChatMessageTime(m.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {outgoing.map((o) => (
                  <div
                    key={o.id}
                    className={`${styles.msgLane} ${styles.msgLaneStaff} ${styles.outgoingLane}`}
                    aria-live="polite"
                  >
                    <div className={styles.msgStack}>
                      <div
                        className={`${styles.bubble} ${styles.bubbleStaff} ${o.kind === "text" ? styles.outgoingBubble : ""}`}
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
                      <div className={styles.msgFooter}>
                        <span className={styles.msgTime}>—</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={listEndRef} />
              </div>
              {err ? <p className={styles.err}>{err}</p> : null}
              <div className={styles.composer}>
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
                        : "Đính kèm tệp (một tệp)"
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
                      placeholder="Trả lời khách…"
                      disabled={sending}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendStaff();
                        }
                      }}
                      onPaste={handleMessagePaste}
                      aria-label="Nội dung trả lời"
                    />
                  </div>
                  <button
                    type="button"
                    className={`${styles.sendIconBtn} ${sending ? styles.sendIconBtnDisabled : ""}`}
                    onClick={() => void sendStaff()}
                    disabled={sending || (!text.trim() && pending.length === 0)}
                    aria-label="Gửi"
                  >
                    <Send className={styles.sendIconGlyph} strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
              </div>
              <ChatImageLightbox src={imageLightboxSrc} onClose={() => setImageLightboxSrc(null)} />
            </div>
          )}
        </section>
        </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}
