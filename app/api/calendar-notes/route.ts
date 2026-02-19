export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { calendarNoteSchema } from "@/lib/validations";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";

const READ_CACHE_HEADERS = { "Cache-Control": "private, max-age=30" };

export async function GET() {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from("calendar_notes")
    .select("*")
    .order("start_datetime", { ascending: true });

  if (error) return badRequest("Takvim notları alınamadı.", error.message);

  return NextResponse.json(data ?? [], { headers: READ_CACHE_HEADERS });
}

export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = calendarNoteSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Takvim notu doğrulanamadı.", parsed.error.flatten());
  }

  const { data, error } = await supabase
    .from("calendar_notes")
    .insert({
      owner_id: user.id,
      title: parsed.data.title,
      start_datetime: parsed.data.startDateTime,
      end_datetime: parsed.data.endDateTime,
      note: parsed.data.note || null,
    })
    .select("id")
    .single();

  if (error || !data) return badRequest("Takvim notu kaydedilemedi.", error?.message);

  return NextResponse.json(data, { status: 201 });
}
