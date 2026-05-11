/**
 * Toast admin — cùng pipeline với cửa hàng (`app-toast`).
 * Giữ export cũ để không phải sửa hàng chục file admin.
 */
import { APP_TOAST_EVENT, showAppToast, type AppToastDetail } from "./app-toast";

export const ADMIN_TOAST_EVENT = APP_TOAST_EVENT;
export type AdminToastDetail = AppToastDetail;
export const showAdminToast = showAppToast;
