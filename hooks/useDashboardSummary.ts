"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export type DashboardWeekLesson = {
  id: string;
  start_datetime: string;
  status: "PLANLANDI" | "YAPILDI" | "GELMEDI";
  payment_status: "ODENDI" | "ODENMEDI" | "KISMI";
  student_name: string;
};

export type DashboardSummaryResponse = {
  weeklyPaid: number;
  monthlyPaid: number;
  expectedReceivables: number;
  monthlyPotential: number;
  weekStart: string;
  weekEnd: string;
  upcomingWeekLessons: DashboardWeekLesson[];
};

export function useDashboardSummary(weekStart?: string) {
  const key = weekStart
    ? `/api/dashboard/summary?weekStart=${weekStart}`
    : "/api/dashboard/summary";

  return useSWR<DashboardSummaryResponse>(key, fetcher);
}
