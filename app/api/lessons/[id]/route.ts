export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { lessonUpsertSchema } from "@/lib/validations";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";
import { computeLessonFee, normalizePayment } from "@/server/services/financeService";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = lessonUpsertSchema.partial().safeParse(body);
  if (!parsed.success) {
    return badRequest("Ders güncelleme verisi hatalı.", parsed.error.flatten());
  }

  const { data: current, error: findError } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .single();

  if (findError || !current) {
    return NextResponse.json({ error: "Ders bulunamadı." }, { status: 404 });
  }

  const nextStatus = parsed.data.status ?? current.status;
  const nextNoShow = parsed.data.noShowFeeRule ?? current.no_show_fee_rule;
  const nextDuration = Number(parsed.data.durationHours ?? current.duration_hours);
  const nextHourlyRate = Number(parsed.data.hourlyRate ?? current.hourly_rate);
  const feeTotal = computeLessonFee({
    status: nextStatus,
    noShowRule: nextNoShow,
    hourlyRate: nextHourlyRate,
    durationHours: nextDuration,
  });

  const payment = normalizePayment({
    paymentStatus: parsed.data.paymentStatus ?? current.payment_status,
    feeTotal,
    amountPaid: Number(parsed.data.amountPaid ?? current.amount_paid),
  });

  const { data, error } = await supabase
    .from("lessons")
    .update({
      student_id: parsed.data.studentId ?? current.student_id,
      recurrence_id: parsed.data.recurrenceId ?? current.recurrence_id,
      start_datetime: parsed.data.startDateTime ?? current.start_datetime,
      end_datetime: parsed.data.endDateTime ?? current.end_datetime,
      duration_hours: nextDuration,
      status: nextStatus,
      no_show_fee_rule: nextNoShow,
      hourly_rate: nextHourlyRate,
      fee_total: feeTotal,
      payment_status: payment.paymentStatus,
      amount_paid: payment.amountPaid,
      note: parsed.data.note ?? current.note,
    })
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    return badRequest("Ders güncellenemedi.", error?.message);
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) {
    return badRequest("Ders silinemedi.", error.message);
  }

  return NextResponse.json({ success: true });
}
