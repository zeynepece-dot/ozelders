export const dynamic = "force-dynamic";

import { addDays, addHours, set } from "date-fns";
import { NextResponse } from "next/server";
import { demoSeedSchema } from "@/lib/validations";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";

export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const parsed = demoSeedSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Demo veri isteği doğrulanamadı.", parsed.error.flatten());
  }

  if (parsed.data.overwrite) {
    await supabase.from("lessons").delete().eq("owner_id", user.id);
    await supabase.from("student_notes").delete().eq("owner_id", user.id);
    await supabase.from("homework").delete().eq("owner_id", user.id);
    await supabase.from("calendar_notes").delete().eq("owner_id", user.id);
    await supabase.from("students").delete().eq("owner_id", user.id);
  }

  const { data: students, error: studentError } = await supabase
    .from("students")
    .insert([
      {
        owner_id: user.id,
        full_name: "Mert Yıldız",
        subject: "Matematik",
        hourly_rate_default: 650,
        phone: "0555 123 45 67",
        parent_name: "Ayşe Yıldız",
        parent_phone: "0555 234 56 78",
      },
      {
        owner_id: user.id,
        full_name: "Defne Acar",
        subject: "Fizik",
        hourly_rate_default: 700,
        phone: "0555 222 33 44",
      },
      {
        owner_id: user.id,
        full_name: "Can Efe",
        subject: "Kimya",
        hourly_rate_default: 600,
        phone: "0555 999 88 77",
      },
    ])
    .select("id,full_name,hourly_rate_default");

  if (studentError || !students) {
    return badRequest("Demo öğrenciler eklenemedi.", studentError?.message);
  }

  const base = addDays(new Date(), -10);

  const lessonDrafts = Array.from({ length: 11 }).map((_, idx) => {
    const student = students[idx % students.length];
    const start = set(addDays(base, idx), { hours: 10 + (idx % 6), minutes: 0, seconds: 0, milliseconds: 0 });
    const duration = idx % 3 === 0 ? 2 : 1.5;
    const status = idx % 5 === 0 ? "GELMEDI" : idx % 7 === 0 ? "IPTAL" : "YAPILDI";
    const noShow = idx % 5 === 0 ? "YARIM_UCRET" : "UCRET_ALINMAZ";
    const fee = status === "IPTAL" ? 0 : status === "GELMEDI" ? Number(student.hourly_rate_default) * duration * 0.5 : Number(student.hourly_rate_default) * duration;
    const paymentStatus = idx % 4 === 0 ? "ODENDI" : idx % 3 === 0 ? "KISMI" : "ODENMEDI";
    const amountPaid = paymentStatus === "ODENDI" ? fee : paymentStatus === "KISMI" ? Number((fee * 0.4).toFixed(2)) : 0;

    return {
      owner_id: user.id,
      student_id: student.id,
      start_datetime: start.toISOString(),
      end_datetime: addHours(start, duration).toISOString(),
      duration_hours: duration,
      status,
      no_show_fee_rule: noShow,
      hourly_rate: student.hourly_rate_default,
      fee_total: fee,
      payment_status: paymentStatus,
      amount_paid: amountPaid,
      note: status === "GELMEDI" ? "Katılamadı" : "Demo ders",
    };
  });

  const { error: lessonError } = await supabase.from("lessons").insert(lessonDrafts);
  if (lessonError) return badRequest("Demo dersler eklenemedi.", lessonError.message);

  await supabase.from("student_notes").insert([
    { owner_id: user.id, student_id: students[0].id, text: "Fonksiyon tekrarları iyi gidiyor." },
    { owner_id: user.id, student_id: students[1].id, text: "Optik ünitesi tekrar edilmeli." },
  ]);

  await supabase.from("homework").insert([
    { owner_id: user.id, student_id: students[0].id, title: "20 soru türev", status: "BEKLIYOR" },
    { owner_id: user.id, student_id: students[2].id, title: "Mol kavramı özeti", status: "TAMAMLANDI" },
  ]);

  await supabase.from("calendar_notes").insert([
    {
      owner_id: user.id,
      title: "Veli toplantısı",
      start_datetime: addDays(new Date(), 2).toISOString(),
      end_datetime: addHours(addDays(new Date(), 2), 1).toISOString(),
      note: "Ödeme planı görüşülecek",
    },
  ]);

  return NextResponse.json({ success: true, message: "Demo veri yüklendi." });
}
