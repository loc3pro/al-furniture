/** Timeout mặc định cho fetch phía client — tránh treo vô hạn / trạng thái loading kẹt. */
export const DEFAULT_CLIENT_FETCH_TIMEOUT_MS = 30_000;

/** Thanh loading điều hướng (top bar) — tắt nếu URL không đổi; ngắn hơn timeout API để UX không kẹt 30s. */
export const NAV_INDICATOR_FAILSAFE_MS = 15_000;

/**
 * `fetch` với Abort sau `timeoutMs`. Gộp với `signal` truyền vào (huỷ một là huỷ cả).
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_CLIENT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const outer = init.signal;

  const onOuterAbort = () => {
    clearTimeout(id);
    controller.abort();
  };

  if (outer) {
    if (outer.aborted) {
      clearTimeout(id);
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }
    outer.addEventListener("abort", onOuterAbort, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
    if (outer) {
      outer.removeEventListener("abort", onOuterAbort);
    }
  }
}
