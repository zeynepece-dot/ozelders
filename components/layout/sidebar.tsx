"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { APP_NAME, SIDEBAR_ITEMS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/shared/logout-button";

function MenuList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {SIDEBAR_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={onNavigate}
            className={cn(
              "block rounded-full px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white",
              active && "bg-white/10 text-white ring-1 ring-white/10",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleMobileSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/giris");
    router.refresh();
  }

  return (
    <>
      <aside className="hidden w-72 flex-col bg-gradient-to-b from-[var(--navy-950)] via-[var(--navy-900)] to-[var(--navy-800)] p-6 text-white md:flex">
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Özel Ders</p>
          <p className="mt-2 text-lg font-semibold leading-tight">{APP_NAME}</p>
        </div>
        <MenuList />
        <div className="mt-auto pt-4">
          <LogoutButton className="w-full border-white/10 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white" />
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-[80] h-14 border-b border-white/10 bg-gradient-to-r from-[var(--navy-950)] via-[var(--navy-900)] to-[var(--navy-800)] text-white backdrop-blur md:hidden">
        <div className="flex h-full items-center gap-3 px-3">
          <button
            type="button"
            aria-label="Menüyü aç"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5 text-white" />
          </button>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold tracking-wide">Özel Ders Takip Programı</div>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[90] md:hidden">
          <button className="absolute inset-0 z-[90] bg-slate-950/60" onClick={() => setOpen(false)} />
          <aside className="relative z-[100] flex h-full w-[280px] flex-col bg-gradient-to-b from-[var(--navy-950)] via-[var(--navy-900)] to-[var(--navy-800)] p-0 text-white">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
              <div className="text-sm font-semibold tracking-wide">Menü</div>
              <Button variant="ghost" size="icon" className="text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6">
              <MenuList onNavigate={() => setOpen(false)} />
            </div>
            <div className="mt-auto border-t border-white/10 p-4">
              <Button
                variant="outline"
                className="w-full justify-start border-white/20 text-white hover:bg-white/10 hover:text-white"
                onClick={handleMobileSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Çıkış
              </Button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
