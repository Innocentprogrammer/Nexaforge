import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-background">
      <SiteHeader />
      <main className="page-enter flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
