"use client";

import { memo } from "react";
import cls from "./BasePanel.module.scss";

export type BasePanelProps = {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

function BasePanelInner({ title, subtitle, children, className, bodyClassName }: BasePanelProps) {
  return (
    <section className={[cls.root, className].filter(Boolean).join(" ")}>
      {title != null && title !== false ? <h2 className={cls.title}>{title}</h2> : null}
      {subtitle != null && subtitle !== false ? <p className={cls.subtitle}>{subtitle}</p> : null}
      <div className={[cls.body, bodyClassName].filter(Boolean).join(" ")}>{children}</div>
    </section>
  );
}

export const BasePanel = memo(BasePanelInner);

BasePanel.displayName = "BasePanel";
