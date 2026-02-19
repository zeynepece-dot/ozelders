import { createClient } from "@/lib/supabase/server-readonly";
import { computeMonthlyStats } from "@/server/services/reportService";

export async function getMonthlyReport(range?: { from?: string; to?: string }) {
  const supabase = createClient();

  let query = supabase
    .from("lessons")
    .select("duration_hours,fee_total,amount_paid,student_id,start_datetime,students!inner(full_name)")
    .order("start_datetime", { ascending: true });

  if (range?.from) query = query.gte("start_datetime", range.from);
  if (range?.to) query = query.lte("start_datetime", range.to);

  const { data, error } = await query;

  if (error) {
    throw new Error("Rapor verisi alınamadı.");
  }

  return computeMonthlyStats((data ?? []) as Array<Record<string, unknown>>);
}

