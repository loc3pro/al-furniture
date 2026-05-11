import { redirect } from "next/navigation";

/** Theme đã gộp vào Cài đặt — giữ URL cũ không gãy bookmark */
export default function AdminThemeRedirectPage() {
  redirect("/admin/settings/theme");
}
