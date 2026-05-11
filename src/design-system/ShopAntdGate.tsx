"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import { dsAntdTheme } from "@/design-system/antd-theme";

export function ShopAntdGate({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider locale={viVN} theme={dsAntdTheme} wave={{ disabled: true }}>
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
