export const dynamic = "force-dynamic";

import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";

const READ_CACHE_HEADERS = { "Cache-Control": "private, max-age=30" };
const studentIdParamSchema = z.object({
  id: z.string().uuid("Öğrenci kimliği geçersiz."),
});

type RecurrenceRow = {
  id: string;
  interval_weeks: number;
  weekdays: number[];
  start_datetime: string;
  end_date: string | null;
  repeat_count: number | null;
  created_at: string;
};

type LessonRow = {
  recurrence_id: string | null;
  start_datetime: string;
  status: "PLANLANDI" | "YAPILDI" | "GELMEDI" | "IPTAL";
  duration_hours: number;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsedParams = studentIdParamSchema.safeParse(await params);
  if (!parsedParams.success) {
    return badRequest("Öğrenci kimliği hatalı.", parsedParams.error.flatten());
  }

  const studentId = parsedParams.data.id;
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const { data: recurrences, error: recurrenceError } = await supabase
    .from("recurrences")
    .select("id,interval_weeks,weekdays,start_datetime,end_date,repeat_count,created_at")
    .eq("owner_id", user.id)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (recurrenceError) {
    return badRequest("Seriler alınamadı.", recurrenceError.message);
  }

  if (!recurrences || recurrences.length === 0) {
    return NextResponse.json([], { headers: READ_CACHE_HEADERS });
  }

  const recurrenceIds = recurrences.map((recurrence) => recurrence.id);
  const { data: lessons, error: lessonError } = await supabase
    .from("lessons")
    .select("recurrence_id,start_datetime,status,duration_hours")
    .in("recurrence_id", recurrenceIds)
    .eq("owner_id", user.id)
    .order("start_datetime", { ascending: true });

  if (lessonError) {
    return badRequest("Seri dersleri alınamadı.", lessonError.message);
  }

  const now = Date.now();
  const lessonsByRecurrence = new Map<string, LessonRow[]>();
  (lessons as LessonRow[] | null)?.forEach((lesson) => {
    if (!lesson.recurrence_id) return;
    const current = lessonsByRecurrence.get(lesson.recurrence_id) ?? [];
    current.push(lesson);
    lessonsByRecurrence.set(lesson.recurrence_id, current);
  });

  const today = new Date().toISOString().slice(0, 10);
  const mapped = (recurrences as RecurrenceRow[]).map((recurrence) => {
    const recurrenceLessons = lessonsByRecurrence.get(recurrence.id) ?? [];
    const futureLessons = recurrenceLessons.filter(
      (lesson) =>
        lesson.status !== "IPTAL" &&
        new Date(lesson.start_datetime).getTime() >= now,
    );
    const nextLesson = futureLessons[0] ?? null;
    const sampleLesson = recurrenceLessons[0] ?? futureLessons[0] ?? null;
    const isActive = !recurrence.end_date || recurrence.end_date >= today;

    return {
      ...recurrence,
      is_active: isActive,
      next_lesson_datetime: nextLesson?.start_datetime ?? null,
      future_count: futureLessons.length,
      duration_hours: Number(sampleLesson?.duration_hours ?? 1),
    };
  });

  mapped.sort((a, b) => Number(b.is_active) - Number(a.is_active));

  return NextResponse.json(mapped, { headers: READ_CACHE_HEADERS });
}
