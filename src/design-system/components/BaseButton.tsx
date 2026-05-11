"use client";

import { forwardRef, memo } from "react";
import { Button, type ButtonProps } from "antd";
import cls from "./BaseButton.module.scss";

export type BaseButtonVariant = "primary" | "default" | "danger" | "ghost";

export type BaseButtonProps = Omit<
  ButtonProps,
  "type" | "size" | "icon" | "iconPosition" | "danger" | "ghost" | "variant"
> & {
  variant?: BaseButtonVariant;
  dsSize?: "sm" | "md";
  fullWidth?: boolean;
};

function BaseButtonInner(
  { variant = "default", dsSize = "md", fullWidth, className, ...rest }: BaseButtonProps,
  ref: React.Ref<HTMLButtonElement | null>,
) {
  const isGhost = variant === "ghost";
  const isDanger = variant === "danger";
  const isPrimary = variant === "primary";

  const antType: ButtonProps["type"] = isDanger ? "primary" : isPrimary ? "primary" : "default";
  const antDanger = Boolean(isDanger);
  const antGhost = isGhost && isPrimary;

  return (
    <Button
      ref={ref}
      type={antType}
      danger={antDanger}
      ghost={antGhost}
      size={dsSize === "sm" ? "middle" : "large"}
      className={[
        cls.root,
        dsSize === "sm" ? cls.sm : cls.md,
        fullWidth ? cls.fullWidth : "",
        isGhost && !isPrimary ? cls.ghost : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

export const BaseButton = memo(forwardRef(BaseButtonInner));

BaseButton.displayName = "BaseButton";
