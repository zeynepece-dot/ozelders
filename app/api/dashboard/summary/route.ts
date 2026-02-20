export const dynamic = "force-dynamic";

import { endOfMonth, endOfWeek, isWithinInterval, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { NextResponse } from "next/server";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";

const READ_CACHE_HEADERS = { "Cache-Control": "private, max-age=30" };

type LessonRow = {
  id: string;
  start_datetime: string;
  status: "PLANLANDI" | "YAPILDI" | "GELMEDI" | "IPTAL";
  payment_status: "ODENDI" | "ODENMEDI" | "KISMI";
  fee_total: number | string;
  amount_paid: number | string;
  students: { full_name: string } | { full_name: string }[] | null;
};

function parseNumber(value: number | string | undefined) {
  return Number(value ?? 0);
}

function toDate(value: string) {
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseWeekStart(raw: string | null) {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = parseISO(`${raw}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getStudentName(students: LessonRow["students"]) {
  if (!students) return "";
  if (Array.isArray(students)) return students[0]?.full_name ?? "";
  return students.full_name;
}

export async function GET(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const requestedWeekStart = parseWeekStart(searchParams.get("weekStart"));
  const weekStart = requestedWeekStart ?? startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const { data, error } = await supabase
    .from("lessons")
    .select("id,start_datetime,status,payment_status,fee_total,amount_paid,students!inner(full_name)")
    .neq("status", "IPTAL")
    .order("start_datetime", { ascending: true });

  if (error) {
    return badRequest("Panel özeti alınamadı.", error.message);
  }

  const lessons = (data ?? []) as LessonRow[];
  let weeklyPaid = 0;
  let monthlyPaid = 0;
  let expectedReceivables = 0;
  let monthlyPotential = 0;

  const upcomingWeekLessons = lessons
    .filter((lesson) => {
      const date = toDate(lesson.start_datetime);
      if (!date) return false;
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    })
    .map((lesson) => ({
      id: lesson.id,
      start_datetime: lesson.start_datetime,
      status: lesson.status,
      payment_status: lesson.payment_status,
      student_name: getStudentName(lesson.students),
    }));

  for (const lesson of lessons) {
    const date = toDate(lesson.start_datetime);
    if (!date) continue;

    const amountPaid = parseNumber(lesson.amount_paid);
    const feeTotal = parseNumber(lesson.fee_total);

    if (isWithinInterval(date, { start: weekStart, end: weekEnd })) {
      weeklyPaid += amountPaid;
    }
    if (isWithinInterval(date, { start: monthStart, end: monthEnd })) {
      monthlyPaid += amountPaid;
      monthlyPotential += feeTotal;
    }
    expectedReceivables += Math.max(feeTotal - amountPaid, 0);
  }

  return NextResponse.json(
    {
      weeklyPaid,
      monthlyPaid,
      expectedReceivables,
      monthlyPotential,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      upcomingWeekLessons,
    },
    { headers: READ_CACHE_HEADERS },
  );
}
