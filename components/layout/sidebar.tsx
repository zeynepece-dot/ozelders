"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { APP_NAME, SIDEBAR_ITEMS } from "@/lib/constants";
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

  return (
    <>
      <aside className="hidden w-72 flex-col bg-gradient-to-b from-[var(--navy-950)] via-[var(--navy-900)] to-[var(--navy-800)] p-6 text-white lg:flex">
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Özel Ders</p>
          <p className="mt-2 text-lg font-semibold leading-tight">{APP_NAME}</p>
        </div>
        <MenuList />
        <div className="mt-auto pt-4">
          <LogoutButton className="w-full border-white/10 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white" />
        </div>
      </aside>

      <Button variant="outline" size="icon" className="fixed left-4 top-4 z-40 lg:hidden" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/60" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 bg-gradient-to-b from-[var(--navy-950)] via-[var(--navy-900)] to-[var(--navy-800)] p-6 text-white">
            <div className="mb-8 flex items-center justify-between">
              <p className="text-base font-semibold">{APP_NAME}</p>
              <Button variant="ghost" size="icon" className="text-slate-200 hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <MenuList onNavigate={() => setOpen(false)} />
            <div className="mt-6">
              <LogoutButton className="w-full border-white/10 bg-transparent text-slate-100 hover:bg-white/10 hover:text-white" />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
