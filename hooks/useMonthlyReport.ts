"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export type MonthlyReportResponse = {
  totalLessonHours: number;
  collected: number;
  receivable: number;
  topStudents: Array<{
    studentId: string;
    studentName: string;
    lessonCount: number;
    totalHours: number;
  }>;
};

export const EMPTY_MONTHLY_REPORT: MonthlyReportResponse = {
  totalLessonHours: 0,
  collected: 0,
  receivable: 0,
  topStudents: [],
};

export function useMonthlyReport(from: string, to: string) {
  const key = `/api/reports/monthly?from=${from}T00:00:00.000Z&to=${to}T23:59:59.999Z`;
  return useSWR<MonthlyReportResponse>(key, fetcher);
}
