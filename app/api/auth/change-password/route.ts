import { NextResponse } from "next/server";
import { changePasswordSchema } from "@/lib/validations";
import { requireApiUser, unauthorized } from "@/server/api";

export async function POST(request: Request) {
  const { supabase, user } = await requireApiUser();
  if (!user) return unauthorized();

  const email = user.email;
  if (!email) {
    return NextResponse.json(
      { error: "Şifre güncellenemedi, tekrar deneyin." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Şifre güncellenemedi, tekrar deneyin.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInError) {
    return NextResponse.json({ error: "Mevcut şifre yanlış." }, { status: 400 });
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json(
      { error: "Şifre güncellenemedi, tekrar deneyin." },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
