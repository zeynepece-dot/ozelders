"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export type LessonApiResponse = {
  id: string;
  student_id: string;
  recurrence_id: string | null;
  start_datetime: string;
  end_datetime: string;
  status: "PLANLANDI" | "YAPILDI" | "GELMEDI" | "IPTAL";
  payment_status: "ODENDI" | "ODENMEDI" | "KISMI";
  amount_paid: number | string;
  duration_hours: number | string;
  hourly_rate: number | string;
  no_show_fee_rule: "UCRET_ALINMAZ" | "YARIM_UCRET" | "TAM_UCRET";
  note: string | null;
  students: { full_name: string };
  recurrences?:
    | { frequency: "WEEKLY" | "BIWEEKLY"; interval_weeks: number }
    | Array<{ frequency: "WEEKLY" | "BIWEEKLY"; interval_weeks: number }>
    | null;
};

export function useLessons() {
  return useSWR<LessonApiResponse[]>("/api/lessons", fetcher);
}
