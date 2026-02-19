"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export type StudentStatusFilter = "AKTIF" | "TUMU";

export type StudentsListItem = {
  id: string;
  fullName: string;
  phone: string | null;
  subject: string;
  hourlyRateDefault: number | string;
  status: "AKTIF" | "PASIF";
  balance: { remainingDebt: number };
};

export function useStudents<T = StudentsListItem[]>(status?: StudentStatusFilter) {
  const key = status ? `/api/students?status=${status}` : "/api/students";
  return useSWR<T>(key, fetcher);
}
