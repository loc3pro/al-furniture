import { permanentRedirect } from "next/navigation";

export default function AdminSystemIntegrationRedirectPage() {
  permanentRedirect("/admin/settings/integration");
}
