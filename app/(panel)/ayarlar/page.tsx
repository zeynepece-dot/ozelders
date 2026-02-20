"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Lock, User } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatDateTR } from "@/lib/format";
import { useSettings } from "@/hooks/useSettings";
import { useProfile } from "@/hooks/useProfile";

const passwordChangeSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z.string(),
    newPasswordRepeat: z.string(),
  })
  .superRefine((value, ctx) => {
    const wantsPasswordChange = Boolean(
      value.currentPassword || value.newPassword || value.newPasswordRepeat,
    );

    if (!wantsPasswordChange) return;

    if (!value.currentPassword || !value.newPassword || !value.newPasswordRepeat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentPassword"],
        message: "Şifre değiştirmek için tüm şifre alanlarını doldurun.",
      });
      return;
    }

    if (value.newPassword.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Yeni şifre en az 6 karakter olmalı.",
      });
    }

    if (value.newPassword !== value.newPasswordRepeat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPasswordRepeat"],
        message: "Yeni şifre tekrarı eşleşmiyor.",
      });
    }
  });

async function parseError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export default function AyarlarPage() {
  const { data: settings, mutate } = useSettings();
  const { data: profile } = useProfile();

  const [adminEmail, setAdminEmail] = useState("");
  const [overdueDays, setOverdueDays] = useState(7);
  const [workdayStart, setWorkdayStart] = useState("08:00");
  const [workdayEnd, setWorkdayEnd] = useState("22:00");
  const [weekStart, setWeekStart] = useState<0 | 1>(1);
  const [hideWeekends, setHideWeekends] = useState(false);
  const [holidayInput, setHolidayInput] = useState("");
  const [holidays, setHolidays] = useState<string[]>([]);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(0);
  const [defaultNoShowFeeRule, setDefaultNoShowFeeRule] = useState<
    "UCRET_ALINMAZ" | "YARIM_UCRET" | "TAM_UCRET"
  >("UCRET_ALINMAZ");
  const [saving, setSaving] = useState(false);

  const [profileEmail, setProfileEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setAdminEmail(settings.admin_email ?? "");
    setOverdueDays(settings.overdue_days ?? 7);
    setWorkdayStart(settings.workday_start ?? "08:00");
    setWorkdayEnd(settings.workday_end ?? "22:00");
    setWeekStart((settings.week_start as 0 | 1) ?? 1);
    setHideWeekends(settings.hide_weekends ?? false);
    setHolidays(
      Array.isArray(settings.holidays)
        ? [...settings.holidays].sort((a, b) => a.localeCompare(b))
        : [],
    );
    setDefaultHourlyRate(Number(settings.default_hourly_rate ?? 0));
    setDefaultNoShowFeeRule(settings.default_no_show_fee_rule ?? "UCRET_ALINMAZ");
  }, [settings]);

  useEffect(() => {
    if (!profile) return;
    setProfileEmail(profile.email ?? "");
  }, [profile]);

  const holidayItems = useMemo(
    () => [...holidays].sort((a, b) => a.localeCompare(b)),
    [holidays],
  );

  const savePassword = async () => {
    const parsed = passwordChangeSchema.safeParse({
      currentPassword,
      newPassword,
      newPasswordRepeat,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Şifre güncellenemedi, tekrar deneyin.");
      return;
    }

    const wantsPasswordChange = Boolean(
      parsed.data.currentPassword ||
        parsed.data.newPassword ||
        parsed.data.newPasswordRepeat,
    );
    if (!wantsPasswordChange) {
      toast.warning("Şifreyi değiştirmek için alanları doldurun.");
      return;
    }

    setPasswordSaving(true);

    const passwordResponse = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      }),
    });

    setPasswordSaving(false);

    if (!passwordResponse.ok) {
      toast.error(
        await parseError(passwordResponse, "Şifre güncellenemedi, tekrar deneyin."),
      );
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordRepeat("");
    toast.success("Şifre güncellendi.");
  };

  const saveSettings = async () => {
    setSaving(true);
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminEmail,
        overdueDays,
        workdayStart,
        workdayEnd,
        weekStart,
        hideWeekends,
        holidays,
        defaultHourlyRate,
        defaultNoShowFeeRule,
      }),
    });
    setSaving(false);

    if (!response.ok) {
      toast.error("Ayarlar kaydedilemedi. Lütfen tekrar deneyin.");
      return;
    }

    await mutate();
    toast.success("Ayarlar kaydedildi.");
  };

  const addHoliday = () => {
    if (!holidayInput) return;
    if (holidays.includes(holidayInput)) {
      toast.warning("Bu tarih zaten tatil olarak ekli.");
      return;
    }
    setHolidays((prev) => [...prev, holidayInput].sort((a, b) => a.localeCompare(b)));
    setHolidayInput("");
  };

  const removeHoliday = (date: string) => {
    setHolidays((prev) => prev.filter((item) => item !== date));
  };

  return (
    <section className="space-y-6">
      <PageHeader title="Ayarlar" subtitle="Sistem ve kullanıcı ayarları" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profil Ayarları
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>E-posta</Label>
              <Input value={profileEmail} disabled readOnly />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Şifre Değiştir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p className="text-xs text-slate-500">
            Şifrenizi değiştirmek istemiyorsanız bu alanları boş bırakın.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Mevcut Şifre</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Yeni Şifre</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Yeni Şifre (Tekrar)</Label>
              <Input
                type="password"
                value={newPasswordRepeat}
                onChange={(e) => setNewPasswordRepeat(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={savePassword} disabled={passwordSaving}>
            {passwordSaving ? "Kaydediliyor..." : "Şifreyi Güncelle"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Genel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Admin E-posta</Label>
              <Input
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="ogretmen@example.com"
              />
            </div>
            <div className="space-y-1">
              <Label>Gecikme gün sayısı</Label>
              <Input
                type="number"
                min={1}
                value={overdueDays}
                onChange={(e) => setOverdueDays(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Çalışma Takvimi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Çalışma saati başlangıç</Label>
              <Input
                type="time"
                value={workdayStart}
                onChange={(e) => setWorkdayStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Çalışma saati bitiş</Label>
              <Input
                type="time"
                value={workdayEnd}
                onChange={(e) => setWorkdayEnd(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Hafta başlangıcı</Label>
              <select
                className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm"
                value={weekStart}
                onChange={(e) => setWeekStart(Number(e.target.value) as 0 | 1)}
              >
                <option value={1}>Pazartesi</option>
                <option value={0}>Pazar</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Hafta sonunu gizle</Label>
              <label className="flex h-10 items-center gap-2 rounded-xl border border-input px-3">
                <input
                  type="checkbox"
                  checked={hideWeekends}
                  onChange={(e) => setHideWeekends(e.target.checked)}
                />
                <span>Aktif</span>
              </label>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <Label>Tatil günleri</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={holidayInput}
                onChange={(e) => setHolidayInput(e.target.value)}
                className="max-w-[220px]"
              />
              <Button type="button" variant="outline" onClick={addHoliday}>
                Ekle
              </Button>
            </div>

            {holidayItems.length === 0 ? (
              <p className="text-xs text-slate-500">Henüz tatil günü eklenmedi.</p>
            ) : (
              <div className="space-y-2">
                {holidayItems.map((date) => (
                  <div
                    key={date}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <span>{formatDateTR(date)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-rose-600 hover:text-rose-700"
                      onClick={() => removeHoliday(date)}
                    >
                      Kaldır
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ücret ve No-show Politikası</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Varsayılan saatlik ücret (₺)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={defaultHourlyRate}
                onChange={(e) => setDefaultHourlyRate(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Varsayılan no-show ücret kuralı</Label>
              <select
                className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm"
                value={defaultNoShowFeeRule}
                onChange={(e) =>
                  setDefaultNoShowFeeRule(
                    e.target.value as "UCRET_ALINMAZ" | "YARIM_UCRET" | "TAM_UCRET",
                  )
                }
              >
                <option value="UCRET_ALINMAZ">Ücret Alınmaz</option>
                <option value="YARIM_UCRET">Yarım Ücret</option>
                <option value="TAM_UCRET">Tam Ücret</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Gelmedi olarak işaretlenen derslerde, ücret bu kurala göre otomatik hesaplanır.
          </p>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Genel Ayarları Kaydet"}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <div className="text-slate-600">Bizimle iletişime geçebilirsiniz</div>
        <a
          href="mailto:cmansuroglu@gmail.com"
          className="mt-1 inline-flex items-center gap-2 font-medium text-slate-900 hover:underline"
        >
          cmansuroglu@gmail.com
        </a>
      </div>
    </section>
  );
}
