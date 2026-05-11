"use client";

type DbTabsProps<K extends string> = {
  active: K;
  items: readonly { key: K; label: string }[];
  onChange: (key: K) => void;
  className?: string;
};

export function DbTabs<K extends string>({ active, items, onChange, className }: DbTabsProps<K>) {
  return (
    <div className={["db-tabs", className].filter(Boolean).join(" ")} role="tablist">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          role="tab"
          aria-selected={active === it.key}
          className={active === it.key ? "db-tabs__btn db-tabs__btn--active" : "db-tabs__btn"}
          onClick={() => onChange(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
