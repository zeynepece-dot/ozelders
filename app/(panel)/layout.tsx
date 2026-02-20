import { DashboardPrefetch } from "@/components/layout/dashboard-prefetch";
import { Sidebar } from "@/components/layout/sidebar";
import { requireUser } from "@/server/auth";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-screen">
      <DashboardPrefetch />
      <Sidebar />
      <main className="w-full p-4 pt-14 md:p-6 md:pt-6 lg:p-8">{children}</main>
    </div>
  );
}
