export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { settingsUpdateSchema } from "@/lib/validations";
import { requireApiUser, unauthorized } from "@/server/api";

const READ_CACHE_HEADERS = { "Cache-Control": "private, max-age=30" };
const SETTINGS_SELECT =
  "id,admin_email,overdue_days,workday_start,workday_end,week_start,hide_weekends,holidays,default_hourly_rate,default_no_show_fee_rule";

async function ensureSettingsRow(
  supabase: Awaited<ReturnType<typeof requireApiUser>>["supabase"],
  ownerId: string,
) {
  const { data: existing, error: existingError } = await supabase
    .from("settings")
    .select(SETTINGS_SELECT)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (existingError) {
    throw new Error("Ayarlar alınamadı.");
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: insertError } = await supabase
    .from("settings")
    .insert({ owner_id: ownerId })
    .select(SETTINGS_SELECT)
    .single();

  if (!insertError && created) {
    return created;
  }

  const { data: afterRace, error: afterRaceError } = await supabase
    .from("settings")
    .select(SETTINGS_SELECT)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (afterRaceError || !afterRace) {
    throw new Error("Ayarlar alınamadı.");
  }

  return afterRace;
}

export async function GET() {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  try {
    const data = await ensureSettingsRow(supabase, user.id);
    return NextResponse.json(data, { headers: READ_CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: "Ayarlar alınamadı." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = settingsUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Ayarlar kaydedilemedi. Lütfen tekrar deneyin.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const existing = await ensureSettingsRow(supabase, user.id);
    const payload = parsed.data;

    const updates = {
      owner_id: user.id,
      admin_email: payload.adminEmail ?? existing.admin_email ?? null,
      overdue_days: Number(payload.overdueDays ?? existing.overdue_days ?? 7),
      workday_start: payload.workdayStart ?? existing.workday_start ?? "08:00",
      workday_end: payload.workdayEnd ?? existing.workday_end ?? "22:00",
      week_start: payload.weekStart ?? existing.week_start ?? 1,
      hide_weekends: payload.hideWeekends ?? existing.hide_weekends ?? false,
      holidays: payload.holidays ?? existing.holidays ?? [],
      default_hourly_rate: Number(
        payload.defaultHourlyRate ?? existing.default_hourly_rate ?? 0,
      ),
      default_no_show_fee_rule:
        payload.defaultNoShowFeeRule ??
        existing.default_no_show_fee_rule ??
        "UCRET_ALINMAZ",
    };

    const { error } = await supabase
      .from("settings")
      .update(updates)
      .eq("owner_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Ayarlar kaydedilemedi. Lütfen tekrar deneyin." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Ayarlar kaydedilemedi. Lütfen tekrar deneyin." },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  return PATCH(request);
}
