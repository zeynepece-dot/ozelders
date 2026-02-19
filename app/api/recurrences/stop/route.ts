export const dynamic = "force-dynamic";

import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";
import { stopRecurrence } from "@/server/services/recurrenceService";

const isoDateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

const stopRecurrenceSchema = z
  .object({
    recurrence_id: z.string().uuid("Seri kimliği geçersiz."),
    stop_mode: z.enum(["NEXT", "DATE"]),
    stop_date: z.string().regex(isoDateOnlyRegex, "Tarih geçersiz.").optional(),
  })
  .refine(
    (value) =>
      value.stop_mode === "NEXT" ||
      (value.stop_mode === "DATE" && Boolean(value.stop_date)),
    {
      message: "Tarih ile durdurma için tarih seçilmelidir.",
      path: ["stop_date"],
    },
  );

export async function POST(request: Request) {
  const { user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = stopRecurrenceSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest("Seri durdurma verisi hatalı.", parsed.error.flatten());
  }

  try {
    const result = await stopRecurrence(
      parsed.data.recurrence_id,
      parsed.data.stop_mode,
      parsed.data.stop_date,
      user.id,
    );
    return NextResponse.json(result);
  } catch (error) {
    return badRequest(
      error instanceof Error ? error.message : "Seri durdurulamadı.",
    );
  }
}
