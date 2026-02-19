export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { studentCreateSchema } from "@/lib/validations";
import { listStudentsWithBalance } from "@/server/repositories/student-repository";
import { badRequest, requireApiUser, serverError, unauthorized } from "@/server/api";

const READ_CACHE_HEADERS = { "Cache-Control": "private, max-age=30" };

export async function GET(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (status) {
    const query = supabase
      .from("students")
      .select("id,full_name,subject,hourly_rate_default")
      .order("full_name", { ascending: true });

    const { data, error } =
      status === "TUMU"
        ? await query
        : await query.eq("status", status);

    if (error) {
      return serverError("Öğrenciler alınırken bir hata oluştu.");
    }

    return NextResponse.json(data ?? [], { headers: READ_CACHE_HEADERS });
  }

  try {
    const students = await listStudentsWithBalance();
    return NextResponse.json(students, { headers: READ_CACHE_HEADERS });
  } catch {
    return serverError("Öğrenciler alınırken bir hata oluştu.");
  }
}

export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = studentCreateSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Öğrenci bilgileri doğrulanamadı.", parsed.error.flatten());
  }

  const data = parsed.data;

  const { data: student, error } = await supabase
    .from("students")
    .insert({
      owner_id: user.id,
      full_name: data.fullName,
      subject: data.subject,
      hourly_rate_default: data.hourlyRateDefault,
      phone: data.phone || null,
      email: data.email || null,
      parent_name: data.parentName || null,
      parent_phone: data.parentPhone || null,
      notes: data.notes || null,
      status: data.status,
    })
    .select("id,full_name")
    .single();

  if (error) {
    return badRequest("Öğrenci kaydı oluşturulamadı.", error.message);
  }

  return NextResponse.json(student, { status: 201 });
}
