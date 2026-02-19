export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { studentUpdateSchema } from "@/lib/validations";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";

const READ_CACHE_HEADERS = { "Cache-Control": "private, max-age=30" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const { data: student, error } = await supabase
    .from("students")
    .select(
      "id,full_name,subject,hourly_rate_default,phone,email,parent_name,parent_phone,notes,status,lessons(*),student_notes(*),homework(*)",
    )
    .eq("id", id)
    .single();

  if (error || !student) {
    return NextResponse.json({ error: "Öğrenci bulunamadı." }, { status: 404 });
  }

  return NextResponse.json(student, { headers: READ_CACHE_HEADERS });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = studentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Öğrenci güncelleme verisi hatalı.", parsed.error.flatten());
  }

  const updates = parsed.data;

  const { data: student, error } = await supabase
    .from("students")
    .update({
      full_name: updates.fullName,
      subject: updates.subject,
      hourly_rate_default: updates.hourlyRateDefault,
      phone: updates.phone,
      email: updates.email,
      parent_name: updates.parentName,
      parent_phone: updates.parentPhone,
      notes: updates.notes,
      status: updates.status,
    })
    .eq("id", id)
    .select("id,full_name,subject,status")
    .single();

  if (error || !student) {
    return badRequest("Öğrenci güncellenemedi.", error?.message);
  }

  return NextResponse.json(student);
}
