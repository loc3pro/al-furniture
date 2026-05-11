import styles from "./Spinner.module.scss";

type Props = {
  /** kích thước vòng quay */
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  /** Trong nút — dùng màu chữ của nút (vd. btn --primary) */
  inheritColor?: boolean;
};

export function Spinner({ size = "md", className, label, inheritColor }: Props) {
  const ringClass = [styles.ring, styles[size], inheritColor && styles.inheritColor, className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={styles.wrap} role={label ? "status" : undefined} aria-label={label}>
      <span className={ringClass} aria-hidden />
      {label ? <span className="visually-hidden">{label}</span> : null}
    </span>
  );
}
