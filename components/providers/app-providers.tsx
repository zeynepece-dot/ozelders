"use client";

import { Toaster } from "sonner";
import { SwrProvider } from "@/components/providers/swr-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SwrProvider>
      {children}
      <Toaster position="top-right" richColors />
    </SwrProvider>
  );
}
