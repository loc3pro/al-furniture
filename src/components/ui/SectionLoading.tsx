import { Spinner } from "./Spinner";
import styles from "./SectionLoading.module.scss";

type Props = {
  /** Chỉ dùng cho screen reader */
  label?: string;
  /** Chiếm full chiều cao khối cha (vd. min-height) */
  fill?: boolean;
  className?: string;
};

/**
 * Loading cục bộ cho một khối (card, bảng, form) — không thay thế loading.tsx route.
 */
export function SectionLoading({ label = "Đang tải", fill = false, className }: Props) {
  return (
    <div
      className={[styles.root, fill ? styles.fill : "", className].filter(Boolean).join(" ")}
      aria-busy="true"
    >
      <Spinner size="md" label={label} />
    </div>
  );
}
