export const dynamic = "force-dynamic";

import { z } from "zod";
import { NextResponse } from "next/server";
import { studentNoteCreateSchema } from "@/lib/validations";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";

const READ_CACHE_HEADERS = { "Cache-Control": "private, max-age=30" };
const paramsSchema = z.object({
  id: z.string().uuid("Öğrenci kimliği geçersiz."),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return badRequest("Öğrenci kimliği hatalı.", parsedParams.error.flatten());
  }

  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from("student_notes")
    .select("id,text,created_at,updated_at")
    .eq("owner_id", user.id)
    .eq("student_id", parsedParams.data.id)
    .order("created_at", { ascending: false });

  if (error) return badRequest("Notlar alınamadı.", error.message);

  return NextResponse.json(data ?? [], { headers: READ_CACHE_HEADERS });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return badRequest("Öğrenci kimliği hatalı.", parsedParams.error.flatten());
  }

  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = studentNoteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Not doğrulanamadı.", parsed.error.flatten());
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("id", parsedParams.data.id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (studentError || !student) {
    return badRequest("Öğrenci bulunamadı.", studentError?.message);
  }

  const { data, error } = await supabase
    .from("student_notes")
    .insert({
      owner_id: user.id,
      student_id: parsedParams.data.id,
      text: parsed.data.text,
    })
    .select("id,text,created_at,updated_at")
    .single();

  if (error || !data) return badRequest("Not eklenemedi.", error?.message);

  return NextResponse.json(data, { status: 201 });
}
