"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { mapSupabaseResetApplyError } from "@/lib/auth/error-map";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Şifre en az 8 karakter olmalıdır."),
    passwordConfirm: z.string().min(8, "Şifre en az 8 karakter olmalıdır."),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Şifreler aynı değil.",
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function LoadingSpinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      passwordConfirm: "",
    },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      toast.error(mapSupabaseResetApplyError(error.message));
      return;
    }

    toast.success("Şifren güncellendi. Giriş yapabilirsin.");
    router.push("/giris");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Yeni Şifre Belirle</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="password">Yeni şifre</Label>
              <Input id="password" type="password" {...form.register("password")} />
              {form.formState.errors.password ? (
                <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-confirm">Yeni şifre (tekrar)</Label>
              <Input
                id="password-confirm"
                type="password"
                {...form.register("passwordConfirm")}
              />
              {form.formState.errors.passwordConfirm ? (
                <p className="text-xs text-red-600">
                  {form.formState.errors.passwordConfirm.message}
                </p>
              ) : null}
            </div>

            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner />
                  Güncelleniyor...
                </span>
              ) : (
                "Şifreyi Güncelle"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
