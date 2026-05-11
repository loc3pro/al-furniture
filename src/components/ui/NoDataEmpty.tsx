import styles from "./NoDataEmpty.module.scss";

export type NoDataEmptyProps = {
  title?: string;
  description?: string;
  className?: string;
  dense?: boolean;
  fill?: boolean;
  colSpan?: number;
  cellClassName?: string;
};


export function NoDataEmpty({
  title = "",
  description,
  className,
  dense,
  fill,
  colSpan,
  cellClassName,
}: NoDataEmptyProps) {
  const fillHeight = fill !== undefined ? fill : Boolean(colSpan) && !dense;

  const inner = (
    <div
      className={[styles.box, dense ? styles.dense : "", fillHeight ? styles.boxFill : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.figure}>
        <picture>
          <source srcSet="/icon/no-data.png" type="image/png" />
          {/* eslint-disable-next-line @next/next/no-img-element -- fallback SVG trong repo */}
          <img src="/icon/no-data.svg" alt="" width={320} height={320} className={styles.img} decoding="async" />
        </picture>
      </div>
      <p className={styles.title}>{title}</p>
      {description ? <p className={styles.desc}>{description}</p> : null}
    </div>
  );

  if (colSpan != null) {
    return (
      <tr className={fillHeight ? styles.trFill : undefined}>
        <td
          colSpan={colSpan}
          className={[fillHeight ? styles.tdFill : styles.tdCell, cellClassName].filter(Boolean).join(" ")}
        >
          {inner}
        </td>
      </tr>
    );
  }

  return inner;
}
