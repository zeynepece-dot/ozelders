import { NextResponse } from "next/server";
import { profileUpsertSchema } from "@/lib/validations";
import { requireApiUser, unauthorized } from "@/server/api";

const READ_CACHE_HEADERS = { "Cache-Control": "private, max-age=30" };

export async function GET() {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name,username")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Profil bilgileri alınamadı." }, { status: 400 });
  }

  return NextResponse.json(
    {
      email: user.email ?? null,
      full_name: data?.full_name ?? null,
      username: data?.username ?? null,
    },
    { headers: READ_CACHE_HEADERS },
  );
}

export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = profileUpsertSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Profil güncellenemedi.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: "Profil güncellenemedi." }, { status: 400 });
  }

  const incomingUsername = parsed.data.username?.trim() || null;
  const usernameToPersist = existing?.username ?? incomingUsername;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: parsed.data.full_name,
      username: usernameToPersist,
    },
    { onConflict: "id" },
  );

  if (error) {
    return NextResponse.json({ error: "Profil güncellenemedi." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
