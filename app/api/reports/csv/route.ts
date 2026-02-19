export const dynamic = "force-dynamic";

import { requireApiUser, unauthorized } from "@/server/api";
import { createClient } from "@/lib/supabase/server-route";

function studentNameFromRelation(students: unknown) {
  if (Array.isArray(students)) {
    return (students[0] as { full_name?: string } | undefined)?.full_name ?? "";
  }

  return (students as { full_name?: string } | null)?.full_name ?? "";
}

export async function GET(request: Request) {
  const { user } = await requireApiUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = createClient();
  let query = supabase
    .from("lessons")
    .select("start_datetime,end_datetime,duration_hours,status,payment_status,fee_total,amount_paid,note,students!inner(full_name)")
    .order("start_datetime", { ascending: true });

  if (from) query = query.gte("start_datetime", from);
  if (to) query = query.lte("start_datetime", to);

  const { data } = await query;

  const rows = [
    ["Baslangic", "Bitis", "Ogrenci", "Sure", "Durum", "Odeme", "Ucret", "Odenen", "Not"],
    ...(data ?? []).map((row) => [
      row.start_datetime,
      row.end_datetime,
      studentNameFromRelation(row.students),
      String(row.duration_hours),
      row.status,
      row.payment_status,
      String(row.fee_total),
      String(row.amount_paid),
      row.note ?? "",
    ]),
  ];

  const csv = rows
    .map((line) =>
      line
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=dersler.csv",
      "Cache-Control": "private, max-age=30",
    },
  });
}

