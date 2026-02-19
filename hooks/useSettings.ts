"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export type SettingsResponse = {
  id: string;
  admin_email: string | null;
  overdue_days: number;
  workday_start: string;
  workday_end: string;
  week_start: 0 | 1;
  hide_weekends: boolean;
  holidays: string[];
  default_hourly_rate: number | string;
  default_no_show_fee_rule: "UCRET_ALINMAZ" | "YARIM_UCRET" | "TAM_UCRET";
};

export function useSettings() {
  return useSWR<SettingsResponse | null>("/api/settings", fetcher);
}
