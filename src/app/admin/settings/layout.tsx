import { SettingsHubTabs } from "./SettingsHubTabs";
import styles from "./settings-hub-layout.module.scss";

export default function AdminSettingsHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.hub}>
      <SettingsHubTabs />
      <div className={styles.hubBody}>{children}</div>
    </div>
  );
}
