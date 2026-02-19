export const dynamic = "force-dynamic";

import { z } from "zod";
import { NextResponse } from "next/server";
import { homeworkUpdateSchema } from "@/lib/validations";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";

const paramsSchema = z.object({
  homeworkId: z.string().uuid("Ödev kimliği geçersiz."),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ homeworkId: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return badRequest("Ödev kimliği hatalı.", parsedParams.error.flatten());
  }

  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = homeworkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Ödev doğrulanamadı.", parsed.error.flatten());
  }

  const updates: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(parsed.data, "title")) {
    updates.title = parsed.data.title;
  }
  if (Object.prototype.hasOwnProperty.call(parsed.data, "description")) {
    updates.description = parsed.data.description || null;
  }
  if (Object.prototype.hasOwnProperty.call(parsed.data, "due_date")) {
    updates.due_date = parsed.data.due_date || null;
  }
  if (Object.prototype.hasOwnProperty.call(parsed.data, "status")) {
    updates.status = parsed.data.status;
  }

  const { data, error } = await supabase
    .from("homework")
    .update(updates)
    .eq("id", parsedParams.data.homeworkId)
    .eq("owner_id", user.id)
    .select("id,title,description,due_date,status,created_at,updated_at")
    .maybeSingle();

  if (error || !data) return badRequest("Ödev güncellenemedi.", error?.message);

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ homeworkId: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return badRequest("Ödev kimliği hatalı.", parsedParams.error.flatten());
  }

  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const { error } = await supabase
    .from("homework")
    .delete()
    .eq("id", parsedParams.data.homeworkId)
    .eq("owner_id", user.id);

  if (error) return badRequest("Ödev silinemedi.", error.message);

  return NextResponse.json({ success: true });
}
