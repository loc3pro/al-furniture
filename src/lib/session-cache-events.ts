/** Dispatch sau đăng nhập / đăng xuất client để đồng bộ session shop (tránh gọi lại /api/auth/me trên mọi route). */
export const SESSION_REFRESH_EVENT = "furniture_session_refresh";

export function dispatchSessionRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_REFRESH_EVENT));
  }
}
