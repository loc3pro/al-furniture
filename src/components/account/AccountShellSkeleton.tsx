"use client";

import shellStyles from "./accountShell.module.scss";
import sk from "./AccountSkeleton.module.scss";

/**
 * Full layout placeholder while shop session / account user is loading.
 * Mirrors AccountLayoutShell sidebar + main so the page does not jump.
 */
export function AccountShellSkeleton() {
  return (
    <div className={`container ${shellStyles.shell}`} aria-busy="true" aria-label="Đang tải tài khoản">
      <aside className={shellStyles.sidebar}>
        <div className={shellStyles.userBlock}>
          <div className={sk.avatarSk} aria-hidden />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className={sk.line} style={{ width: "55%", maxWidth: 140 }} />
            <div className={sk.line} style={{ width: "85%", maxWidth: 200, marginBottom: 0 }} />
          </div>
        </div>

        <nav className={shellStyles.nav} aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={sk.navRow}>
              <span className={sk.navIcon} />
              <span className={sk.navText} />
            </div>
          ))}
        </nav>

        <div className={shellStyles.contact} style={{ marginTop: "1.25rem", paddingTop: "1rem" }}>
          <div className={sk.contactLine} style={{ width: "88%" }} />
          <div className={sk.contactLine} style={{ width: "72%" }} />
        </div>

        <div className={sk.logoutSk} aria-hidden />
      </aside>

      <main className={shellStyles.main}>
        <div className={sk.mainTitleSk} />
        <div className={sk.cardSk} style={{ minHeight: "7rem" }} />
        <div className={sk.cardSk} style={{ minHeight: "5rem", maxWidth: "420px" }} />
      </main>
    </div>
  );
}
