export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { lessonUpsertSchema } from "@/lib/validations";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";
import { computeLessonFee, normalizePayment } from "@/server/services/financeService";

const READ_CACHE_HEADERS = { "Cache-Control": "private, max-age=30" };

export async function GET(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("lessons")
    .select("*, students!inner(full_name), recurrences(frequency, interval_weeks)")
    .order("start_datetime", { ascending: true });

  if (from) {
    query = query.gte("start_datetime", `${from}T00:00:00`);
  }

  if (to) {
    query = query.lte("start_datetime", `${to}T23:59:59`);
  }

  const { data, error } = await query;

  if (error) {
    return badRequest("Dersler alınamadı.", error.message);
  }

  return NextResponse.json(data ?? [], { headers: READ_CACHE_HEADERS });
}

export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = lessonUpsertSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Ders bilgileri doğrulanamadı.", parsed.error.flatten());
  }

  const payload = parsed.data;
  const feeTotal = computeLessonFee({
    status: payload.status,
    noShowRule: payload.noShowFeeRule,
    hourlyRate: payload.hourlyRate,
    durationHours: payload.durationHours,
  });
  const payment = normalizePayment({
    paymentStatus: payload.paymentStatus,
    feeTotal,
    amountPaid: payload.amountPaid,
  });

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      owner_id: user.id,
      student_id: payload.studentId,
      recurrence_id: payload.recurrenceId ?? null,
      start_datetime: payload.startDateTime,
      end_datetime: payload.endDateTime,
      duration_hours: payload.durationHours,
      status: payload.status,
      no_show_fee_rule: payload.noShowFeeRule,
      hourly_rate: payload.hourlyRate,
      fee_total: feeTotal,
      payment_status: payment.paymentStatus,
      amount_paid: payment.amountPaid,
      note: payload.note || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return badRequest("Ders kaydı oluşturulamadı.", error?.message);
  }

  return NextResponse.json(data, { status: 201 });
}
