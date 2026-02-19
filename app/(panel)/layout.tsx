import { Sidebar } from "@/components/layout/sidebar";
import { requireUser } from "@/server/auth";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="w-full p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
