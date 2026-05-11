import { Suspense } from "react";
import { SectionLoading } from "@/components/ui/SectionLoading";
import { ChatAdminPanel } from "./ChatAdminPanel";

export default function AdminChatPage() {
  return (
    <Suspense fallback={<SectionLoading fill label="Đang tải chat" />}>
      <ChatAdminPanel />
    </Suspense>
  );
}
