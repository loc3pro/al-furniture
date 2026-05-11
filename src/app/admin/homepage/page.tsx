import HomePageAdminClientGate from "./HomePageAdminClientGate";

export default function AdminHomepageSettingsPage() {
  /* Không bọc div thừa — làm vỡ chuỗi flex/min-height, header AdminPageLayout không còn cố định */
  return <HomePageAdminClientGate />;
}
