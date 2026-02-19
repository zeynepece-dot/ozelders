"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export type CalendarNoteApiResponse = {
  id: string;
  title: string;
  start_datetime: string;
  end_datetime: string;
  note: string | null;
};

export function useCalendarNotes() {
  return useSWR<CalendarNoteApiResponse[]>("/api/calendar-notes", fetcher);
}
