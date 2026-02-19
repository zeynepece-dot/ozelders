import { createClient } from "@/lib/supabase/server-readonly";

export type LessonStatus = "PLANLANDI" | "YAPILDI" | "GELMEDI" | "IPTAL";
export type NoShowFeeRule = "UCRET_ALINMAZ" | "YARIM_UCRET" | "TAM_UCRET";
export type PaymentStatus = "ODENDI" | "ODENMEDI" | "KISMI";

export function computeLessonFee(params: {
  status: LessonStatus;
  noShowRule: NoShowFeeRule;
  hourlyRate: number;
  durationHours: number;
}) {
  const { status, noShowRule, hourlyRate, durationHours } = params;
  const baseFee = Number((hourlyRate * durationHours).toFixed(2));

  if (status === "IPTAL") return 0;
  if (status === "YAPILDI" || status === "PLANLANDI") return baseFee;

  if (noShowRule === "TAM_UCRET") return baseFee;
  if (noShowRule === "YARIM_UCRET") return Number((baseFee / 2).toFixed(2));
  return 0;
}

export function normalizePayment(params: {
  paymentStatus: PaymentStatus;
  feeTotal: number;
  amountPaid: number;
}) {
  const { paymentStatus, feeTotal } = params;

  if (paymentStatus === "ODENDI") {
    return { paymentStatus: "ODENDI" as const, amountPaid: feeTotal };
  }

  if (paymentStatus === "ODENMEDI") {
    return { paymentStatus: "ODENMEDI" as const, amountPaid: 0 };
  }

  const safeAmount = Math.min(Math.max(params.amountPaid ?? 0, 0), feeTotal);
  return { paymentStatus: "KISMI" as const, amountPaid: Number(safeAmount.toFixed(2)) };
}

export async function computeStudentBalance(
  studentId: string,
  dateRange?: { from?: string; to?: string },
) {
  const supabase = createClient();

  let query = supabase
    .from("lessons")
    .select("fee_total,amount_paid")
    .eq("student_id", studentId);

  if (dateRange?.from) query = query.gte("start_datetime", dateRange.from);
  if (dateRange?.to) query = query.lte("start_datetime", dateRange.to);

  const { data, error } = await query;
  if (error) throw new Error("Öğrenci bakiyesi hesaplanamadı.");

  const totalFee = (data ?? []).reduce((sum, row) => sum + Number(row.fee_total), 0);
  const totalPaid = (data ?? []).reduce((sum, row) => sum + Number(row.amount_paid), 0);

  return {
    totalFee: Number(totalFee.toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
    balance: Number((totalFee - totalPaid).toFixed(2)),
  };
}

