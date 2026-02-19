export const dynamic = "force-dynamic";

import { z } from "zod";
import { NextResponse } from "next/server";
import { studentNoteUpdateSchema } from "@/lib/validations";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";

const paramsSchema = z.object({
  noteId: z.string().uuid("Not kimliği geçersiz."),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return badRequest("Not kimliği hatalı.", parsedParams.error.flatten());
  }

  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = studentNoteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Not doğrulanamadı.", parsed.error.flatten());
  }

  const { data, error } = await supabase
    .from("student_notes")
    .update({ text: parsed.data.text })
    .eq("id", parsedParams.data.noteId)
    .eq("owner_id", user.id)
    .select("id,text,created_at,updated_at")
    .maybeSingle();

  if (error || !data) return badRequest("Not güncellenemedi.", error?.message);

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return badRequest("Not kimliği hatalı.", parsedParams.error.flatten());
  }

  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const { error } = await supabase
    .from("student_notes")
    .delete()
    .eq("id", parsedParams.data.noteId)
    .eq("owner_id", user.id);

  if (error) return badRequest("Not silinemedi.", error.message);

  return NextResponse.json({ success: true });
}
