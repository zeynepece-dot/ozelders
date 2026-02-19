export const dynamic = "force-dynamic";

import { z } from "zod";
import { NextResponse } from "next/server";
import { homeworkCreateSchema, homeworkStatusFilterSchema } from "@/lib/validations";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";

const READ_CACHE_HEADERS = { "Cache-Control": "private, max-age=30" };
const paramsSchema = z.object({
  id: z.string().uuid("Öğrenci kimliği geçersiz."),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return badRequest("Öğrenci kimliği hatalı.", parsedParams.error.flatten());
  }

  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const parsedQuery = homeworkStatusFilterSchema.safeParse({
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsedQuery.success) {
    return badRequest("Ödev filtre parametresi hatalı.", parsedQuery.error.flatten());
  }

  let query = supabase
    .from("homework")
    .select("id,title,description,due_date,status,created_at,updated_at")
    .eq("owner_id", user.id)
    .eq("student_id", parsedParams.data.id)
    .order("created_at", { ascending: false });

  const status = parsedQuery.data.status ?? "ALL";
  if (status !== "ALL") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return badRequest("Ödevler alınamadı.", error.message);

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
  const parsed = homeworkCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Ödev doğrulanamadı.", parsed.error.flatten());
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
    .from("homework")
    .insert({
      owner_id: user.id,
      student_id: parsedParams.data.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      due_date: parsed.data.due_date || null,
      status: "BEKLIYOR",
    })
    .select("id,title,description,due_date,status,created_at,updated_at")
    .single();

  if (error || !data) return badRequest("Ödev eklenemedi.", error?.message);

  return NextResponse.json(data, { status: 201 });
}
