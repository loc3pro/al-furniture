/** CustomEvent — `ToastViewport` (cửa hàng + admin) lắng nghe. */
export const APP_TOAST_EVENT = "furniture_app_toast";

export type AppToastDetail = {
  message: string;
  variant?: "success" | "error";
};

export function showAppToast(message: string, variant: "success" | "error" = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AppToastDetail>(APP_TOAST_EVENT, {
      detail: { message, variant },
    }),
  );
}
