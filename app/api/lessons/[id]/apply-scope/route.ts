export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { lessonScopeApplySchema } from "@/lib/validations";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";
import { updateLessonScope } from "@/server/services/recurrenceService";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const parsed = lessonScopeApplySchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Kapsam güncelleme verisi hatalı.", parsed.error.flatten());
  }

  try {
    const result = await updateLessonScope(id, parsed.data.scope, parsed.data.patch, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return badRequest(
      error instanceof Error ? error.message : "Kapsam güncellemesi sırasında hata oluştu.",
    );
  }
}
