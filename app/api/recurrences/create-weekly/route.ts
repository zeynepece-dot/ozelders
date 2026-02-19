export const dynamic = "force-dynamic";

import { addWeeks } from "date-fns";
import { NextResponse } from "next/server";
import { weeklyRecurrenceCreateSchema } from "@/lib/validations";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";
import { computeLessonFee, normalizePayment } from "@/server/services/financeService";

function toUtcDateTime(dateOnly: string, time: string) {
  return new Date(`${dateOnly}T${time}:00`);
}

function getFirstOccurrence(startDate: string, time: string, weekday: number) {
  const initial = toUtcDateTime(startDate, time);
  const diff = (weekday - initial.getDay() + 7) % 7;
  initial.setDate(initial.getDate() + diff);
  return initial;
}

export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = weeklyRecurrenceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Haftalık seri verisi hatalı.", parsed.error.flatten());
  }

  const payload = parsed.data;
  const defaultCount = 12;
  const targetCount = payload.count ?? (payload.end_date ? undefined : defaultCount);
  const firstStart = getFirstOccurrence(payload.start_date, payload.time, payload.weekday);
  const durationMs = Math.round(payload.duration_hours * 60 * 60 * 1000);
  const endLimit = payload.end_date
    ? new Date(`${payload.end_date}T23:59:59`)
    : null;

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id,hourly_rate_default")
    .eq("id", payload.student_id)
    .eq("owner_id", user.id)
    .single();

  if (studentError || !student) {
    return badRequest("Öğrenci bulunamadı.");
  }

  const selectedHourlyRate = Number(
    payload.hourly_rate ?? student.hourly_rate_default ?? 0,
  );
  const selectedNoShowRule = payload.no_show_fee_rule ?? "UCRET_ALINMAZ";

  const instances: Array<{ start: Date; end: Date }> = [];
  for (let i = 0; i < 520; i += 1) {
    const start = addWeeks(firstStart, i);
    if (endLimit && start.getTime() > endLimit.getTime()) break;
    instances.push({ start, end: new Date(start.getTime() + durationMs) });
    if (targetCount && instances.length >= targetCount) break;
  }

  if (instances.length === 0) {
    return badRequest("Seçilen aralıkta ders üretilemedi.");
  }

  const recurrenceStart = instances[0].start.toISOString();
  const recurrenceEnd = payload.end_date
    ? payload.end_date
    : instances[instances.length - 1].start.toISOString().slice(0, 10);

  const { data: recurrence, error: recurrenceError } = await supabase
    .from("recurrences")
    .insert({
      owner_id: user.id,
      student_id: payload.student_id,
      frequency: "WEEKLY",
      interval_weeks: 1,
      weekdays: [payload.weekday],
      start_datetime: recurrenceStart,
      end_date: recurrenceEnd,
      repeat_count: targetCount ?? instances.length,
      timezone: "Europe/Istanbul",
    })
    .select("id")
    .single();

  if (recurrenceError || !recurrence) {
    return badRequest("Haftalık seri oluşturulamadı.", recurrenceError?.message);
  }

  const lessons = instances.map((instance) => {
    const feeTotal = computeLessonFee({
      status: "PLANLANDI",
      noShowRule: selectedNoShowRule,
      hourlyRate: selectedHourlyRate,
      durationHours: payload.duration_hours,
    });
    const payment = normalizePayment({
      paymentStatus: "ODENMEDI",
      feeTotal,
      amountPaid: 0,
    });

    return {
      owner_id: user.id,
      student_id: payload.student_id,
      recurrence_id: recurrence.id,
      start_datetime: instance.start.toISOString(),
      end_datetime: instance.end.toISOString(),
      duration_hours: payload.duration_hours,
      status: "PLANLANDI",
      no_show_fee_rule: selectedNoShowRule,
      hourly_rate: selectedHourlyRate,
      fee_total: feeTotal,
      payment_status: payment.paymentStatus,
      amount_paid: payment.amountPaid,
      note: payload.note || null,
    };
  });

  const { error: lessonError } = await supabase.from("lessons").insert(lessons);
  if (lessonError) {
    return badRequest("Haftalık seri dersleri kaydedilemedi.", lessonError.message);
  }

  return NextResponse.json({
    recurrence_id: recurrence.id,
    created_count: lessons.length,
  });
}
