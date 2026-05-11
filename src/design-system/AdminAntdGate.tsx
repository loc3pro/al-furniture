"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import { dsAntdTheme } from "@/design-system/antd-theme";

function adminGetPopupContainer(triggerNode?: HTMLElement | null): HTMLElement {
  if (triggerNode == null || typeof triggerNode.closest !== "function") {
    return document.body;
  }
  /**
   * Không mount vào root `[data-admin-right-panel]`: root có `pointer-events: none`
   * (chỉ backdrop + `.panel` là auto) — popup là con của root sẽ không nhận click
   * (Select / DatePicker / Dropdown trong panel phải).
   */
  const docked = triggerNode.closest<HTMLElement>('[role="dialog"]');
  if (docked?.closest("[data-admin-right-panel]")) {
    return docked;
  }
  return document.body;
}

export function AdminAntdGate({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider
        locale={viVN}
        theme={{ ...dsAntdTheme, cssVar: { key: "furniture-admin" } }}
        wave={{ disabled: true }}
        getPopupContainer={adminGetPopupContainer}
      >
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
