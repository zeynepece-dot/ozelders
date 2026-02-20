"use client";

import { useEffect } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";

const MENU_ROUTES = ["/panel", "/ogrenciler", "/takvim", "/raporlar", "/ayarlar"] as const;

async function fetchAndCacheJson(
  key: string,
  mutate: ReturnType<typeof useSWRConfig>["mutate"],
  signal: AbortSignal,
) {
  const response = await fetch(key, { signal, cache: "no-store" });
  if (!response.ok) return;
  const data = await response.json();
  mutate(key, data, { revalidate: false, populateCache: true });
}

export function DashboardPrefetch() {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    for (const route of MENU_ROUTES) {
      router.prefetch(route);
    }

    const controller = new AbortController();
    const now = new Date();
    const from = format(startOfMonth(now), "yyyy-MM-dd");
    const to = format(endOfMonth(now), "yyyy-MM-dd");
    const lessonKey = `/api/lessons?from=${from}&to=${to}`;

    void Promise.all([
      fetchAndCacheJson("/api/settings", mutate, controller.signal),
      fetchAndCacheJson("/api/students?status=AKTIF", mutate, controller.signal),
      fetchAndCacheJson(lessonKey, mutate, controller.signal),
      fetchAndCacheJson("/api/dashboard/summary", mutate, controller.signal),
    ]).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    });

    return () => controller.abort();
  }, [mutate, router]);

  return null;
}
