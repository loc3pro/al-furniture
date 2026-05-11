import { AccountProvider } from "@/components/account/AccountContext";
import { AccountLayoutShell } from "@/components/account/AccountLayoutShell";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountProvider>
      <AccountLayoutShell>{children}</AccountLayoutShell>
    </AccountProvider>
  );
}
