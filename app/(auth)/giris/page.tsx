"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { mapSupabaseResetRequestError } from "@/lib/auth/error-map";
import { authSignInSchema, authSignUpSchema } from "@/lib/validations";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SignInFormValues = z.infer<typeof authSignInSchema>;
type SignUpFormValues = z.infer<typeof authSignUpSchema>;
type ForgotFormValues = { email: string };

const forgotPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin."),
});

function LoadingSpinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}

export default function GirisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const allowSignUp = process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "false";

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [signupMessage, setSignupMessage] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const authNotice = useMemo(() => {
    const code = searchParams.get("e");
    if (code === "dogrulama_linki_hatali") {
      return "Doğrulama linki geçersiz veya süresi dolmuş. Lütfen tekrar deneyin.";
    }
    if (code === "dogrulama_basarisiz") {
      return "E-posta doğrulama başarısız oldu. Lütfen yeni link isteyin.";
    }
    return "";
  }, [searchParams]);

  const supabase = useMemo(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return null;
    }
    return createBrowserSupabaseClient();
  }, []);

  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(authSignInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(authSignUpSchema),
    defaultValues: { email: "", password: "", passwordConfirm: "" },
  });

  const forgotForm = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function handleSignIn(values: SignInFormValues) {
    if (!supabase) {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast.error("E-posta veya şifre hatalı.");
      return;
    }

    router.push("/panel");
    router.refresh();
  }

  async function handleSignUp(values: SignUpFormValues) {
    if (!supabase) {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
      return;
    }

    setSignupMessage("");
    setSignupEmail("");
    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/confirm`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      const normalized = error.message.toLowerCase();
      if (
        normalized.includes("already registered") ||
        normalized.includes("already been registered")
      ) {
        toast.error("Bu e-posta zaten kayıtlı olabilir.");
        return;
      }
      toast.error("Kayıt sırasında hata oluştu. Tekrar deneyin.");
      return;
    }

    if (data.session) {
      router.push("/panel");
      router.refresh();
      return;
    }

    setSignupEmail(values.email);
    setSignupMessage(
      "Doğrulama e-postası gönderildi. Lütfen gelen kutunuzu kontrol edin.",
    );
    setTab("signin");
    signUpForm.reset();
  }

  async function handleResendSignupEmail() {
    if (!supabase || !signupEmail) {
      toast.error("E-posta tekrar gönderilemedi. Lütfen tekrar deneyin.");
      return;
    }

    setResendLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: signupEmail,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/confirm`
            : undefined,
      },
    });
    setResendLoading(false);

    if (error) {
      toast.error("E-posta tekrar gönderilemedi. Lütfen tekrar deneyin.");
      return;
    }

    toast.success("Doğrulama e-postası tekrar gönderildi.");
  }

  async function handleForgotPassword(values: ForgotFormValues) {
    if (!supabase) {
      toast.error("Bağlantı gönderilemedi. Lütfen tekrar deneyin.");
      return;
    }

    setForgotLoading(true);
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/reset` : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo,
    });
    setForgotLoading(false);

    if (error) {
      toast.error(mapSupabaseResetRequestError(error.message));
      return;
    }

    toast.success(
      "Eğer bu e-posta ile bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.",
    );
    setForgotOpen(false);
    forgotForm.reset();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-200 bg-white/90 backdrop-blur">
        <CardHeader>
          <CardTitle>Hesabına Giriş Yap</CardTitle>
          <CardDescription>Özel Ders Yönetim Paneli</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value as "signin" | "signup");
              if (value === "signup") {
                setSignupMessage("");
              }
            }}
            className="w-full"
          >
            <TabsList
              className={`grid w-full ${allowSignUp ? "grid-cols-2" : "grid-cols-1"}`}
            >
              <TabsTrigger value="signin">Giriş Yap</TabsTrigger>
              {allowSignUp ? <TabsTrigger value="signup">Kayıt Ol</TabsTrigger> : null}
            </TabsList>

            <TabsContent value="signin">
              {signupMessage || authNotice ? (
                <Alert className="mb-4">
                  <AlertTitle>E-posta Doğrulama</AlertTitle>
                  <AlertDescription>{authNotice || signupMessage}</AlertDescription>
                </Alert>
              ) : null}

              <form className="space-y-4" onSubmit={signInForm.handleSubmit(handleSignIn)}>
                <div className="space-y-2">
                  <Label htmlFor="signin-email">E-posta</Label>
                  <Input id="signin-email" type="email" {...signInForm.register("email")} />
                  {signInForm.formState.errors.email ? (
                    <p className="text-xs text-red-600">
                      {signInForm.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Şifre</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    {...signInForm.register("password")}
                  />
                  {signInForm.formState.errors.password ? (
                    <p className="text-xs text-red-600">
                      {signInForm.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>
                <Button
                  className="w-full"
                  type="submit"
                  disabled={signInForm.formState.isSubmitting}
                >
                  {signInForm.formState.isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <LoadingSpinner />
                      İşleniyor...
                    </span>
                  ) : (
                    "Giriş Yap"
                  )}
                </Button>

                <button
                  type="button"
                  className="w-full text-sm text-slate-600 underline"
                  onClick={() => setForgotOpen(true)}
                >
                  Şifremi unuttum
                </button>

                {signupEmail ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResendSignupEmail}
                    disabled={resendLoading}
                  >
                    {resendLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <LoadingSpinner />
                        Gönderiliyor...
                      </span>
                    ) : (
                      "Doğrulama e-postasını tekrar gönder"
                    )}
                  </Button>
                ) : null}
              </form>
            </TabsContent>

            {allowSignUp ? (
              <TabsContent value="signup">
                <form className="space-y-4" onSubmit={signUpForm.handleSubmit(handleSignUp)}>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-posta</Label>
                    <Input id="signup-email" type="email" {...signUpForm.register("email")} />
                    {signUpForm.formState.errors.email ? (
                      <p className="text-xs text-red-600">
                        {signUpForm.formState.errors.email.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Şifre</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      {...signUpForm.register("password")}
                    />
                    {signUpForm.formState.errors.password ? (
                      <p className="text-xs text-red-600">
                        {signUpForm.formState.errors.password.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password-confirm">Şifre (tekrar)</Label>
                    <Input
                      id="signup-password-confirm"
                      type="password"
                      {...signUpForm.register("passwordConfirm")}
                    />
                    {signUpForm.formState.errors.passwordConfirm ? (
                      <p className="text-xs text-red-600">
                        {signUpForm.formState.errors.passwordConfirm.message}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    className="w-full"
                    type="submit"
                    disabled={signUpForm.formState.isSubmitting}
                  >
                    {signUpForm.formState.isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <LoadingSpinner />
                        İşleniyor...
                      </span>
                    ) : (
                      "Hesap Oluştur"
                    )}
                  </Button>
                </form>
              </TabsContent>
            ) : null}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Şifre Sıfırlama</DialogTitle>
            <DialogDescription>
              E-posta adresini gir, şifre sıfırlama bağlantısı gönderelim.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={forgotForm.handleSubmit(handleForgotPassword)}>
            <div className="space-y-1">
              <Label htmlFor="forgot-email">E-posta</Label>
              <Input id="forgot-email" type="email" {...forgotForm.register("email")} />
              {forgotForm.formState.errors.email ? (
                <p className="text-xs text-red-600">
                  {forgotForm.formState.errors.email.message}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={forgotLoading}>
                {forgotLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <LoadingSpinner />
                    Gönderiliyor...
                  </span>
                ) : (
                  "Bağlantı Gönder"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
