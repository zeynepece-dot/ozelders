"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays, Coins, HandCoins, Wallet } from "lucide-react";
import { useLessons, type LessonApiResponse } from "@/hooks/useLessons";
import { formatCurrencyTRY } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type KpiCard = {
  title: string;
  value: string;
  icon: typeof Wallet;
};

type DaySchedule = {
  key: string;
  day: Date;
  lessons: LessonApiResponse[];
};

function parseNumber(value: number | string | undefined) {
  return Number(value ?? 0);
}

function toDate(value: string) {
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function lessonFeeTotal(lesson: LessonApiResponse) {
  const explicitFee = parseNumber(lesson.fee_total);
  if (Number.isFinite(explicitFee) && explicitFee > 0) return explicitFee;
  return parseNumber(lesson.hourly_rate) * parseNumber(lesson.duration_hours);
}

function statusBadgeClass(status: LessonApiResponse["status"]) {
  if (status === "YAPILDI") return "bg-emerald-100 text-emerald-700";
  if (status === "GELMEDI") return "bg-amber-100 text-amber-700";
  if (status === "IPTAL") return "bg-slate-200 text-slate-600";
  return "bg-blue-100 text-blue-700";
}

function statusLabel(status: LessonApiResponse["status"]) {
  if (status === "YAPILDI") return "Yapıldı";
  if (status === "GELMEDI") return "Gelmedi";
  if (status === "IPTAL") return "İptal";
  return "Planlandı";
}

function paymentBadgeClass(paymentStatus: LessonApiResponse["payment_status"]) {
  if (paymentStatus === "ODENDI") return "bg-emerald-100 text-emerald-700";
  if (paymentStatus === "KISMI") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

function paymentLabel(paymentStatus: LessonApiResponse["payment_status"]) {
  if (paymentStatus === "ODENDI") return "Ödendi";
  if (paymentStatus === "KISMI") return "Kısmi";
  return "Ödenmedi";
}

export function PanelDashboard() {
  const { data: lessons = [] } = useLessons();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const monthStart = useMemo(() => startOfMonth(new Date()), []);
  const monthEnd = useMemo(() => endOfMonth(new Date()), []);

  const activeLessons = useMemo(
    () => lessons.filter((lesson) => lesson.status !== "IPTAL"),
    [lessons],
  );

  const metrics = useMemo(() => {
    let weekCollected = 0;
    let monthCollected = 0;
    let expectedPayments = 0;
    let monthPotential = 0;

    for (const lesson of activeLessons) {
      const startDate = toDate(lesson.start_datetime);
      if (!startDate) continue;

      const amountPaid = parseNumber(lesson.amount_paid);
      const feeTotal = lessonFeeTotal(lesson);

      if (isWithinInterval(startDate, { start: weekStart, end: weekEnd })) {
        weekCollected += amountPaid;
      }

      if (isWithinInterval(startDate, { start: monthStart, end: monthEnd })) {
        monthCollected += amountPaid;
        monthPotential += feeTotal;
      }

      expectedPayments += Math.max(feeTotal - amountPaid, 0);
    }

    return {
      weekCollected,
      monthCollected,
      expectedPayments,
      monthPotential,
    };
  }, [activeLessons, monthEnd, monthStart, weekEnd, weekStart]);

  const weekLessons = useMemo(() => {
    return activeLessons.filter((lesson) => {
      const startDate = toDate(lesson.start_datetime);
      if (!startDate) return false;
      return isWithinInterval(startDate, { start: weekStart, end: weekEnd });
    });
  }, [activeLessons, weekEnd, weekStart]);

  const weeklySchedule = useMemo<DaySchedule[]>(() => {
    const groups = weekLessons.reduce<Record<string, LessonApiResponse[]>>((acc, lesson) => {
      const startDate = toDate(lesson.start_datetime);
      if (!startDate) return acc;
      const key = format(startDate, "yyyy-MM-dd");
      (acc[key] ||= []).push(lesson);
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([key, items]) => ({
        key,
        day: new Date(`${key}T00:00:00`),
        lessons: [...items].sort((a, b) => {
          const aTime = toDate(a.start_datetime)?.getTime() ?? 0;
          const bTime = toDate(b.start_datetime)?.getTime() ?? 0;
          return aTime - bTime;
        }),
      }))
      .sort((a, b) => a.day.getTime() - b.day.getTime());
  }, [weekLessons]);

  const kpiCards: KpiCard[] = [
    {
      title: "Bu Haftaki Kazanç",
      value: formatCurrencyTRY(metrics.weekCollected),
      icon: Coins,
    },
    {
      title: "Bu Aylık Kazanç",
      value: formatCurrencyTRY(metrics.monthCollected),
      icon: Wallet,
    },
    {
      title: "Beklenen Ödemeler",
      value: formatCurrencyTRY(metrics.expectedPayments),
      icon: HandCoins,
    },
    {
      title: "Bu Ayki Potansiyel Kazanç",
      value: formatCurrencyTRY(metrics.monthPotential),
      icon: CalendarDays,
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-3">
        <Button asChild size="lg" className="h-auto w-full justify-center px-5 py-4 text-base font-semibold">
          <Link href="/ogrenciler">🎓 Öğrenci Ekle/Güncelle</Link>
        </Button>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">
              🎓 Öğrenci Ekle/Güncelle butonuna tıklayıp ilk öğrencinizi ekleyin.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-500">{card.title}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{card.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="space-y-3">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <Button type="button" size="sm" variant="outline" onClick={() => setWeekStart((prev) => addDays(prev, -7))}>
            ◀ Önceki Hafta
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-900">
              {format(weekStart, "d MMMM", { locale: tr })} - {format(weekEnd, "d MMMM yyyy", { locale: tr })}
            </p>
            <p className="text-xs text-slate-500">Haftalık Program</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => setWeekStart((prev) => addDays(prev, 7))}>
            Sonraki Hafta ▶
          </Button>
        </div>

        <div className="space-y-3">
          {weeklySchedule.length === 0 ? (
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-slate-600">Bu hafta planlanmış ders yok.</p>
                <Button
                  asChild
                  variant="ghost"
                  className="mt-2 h-auto w-full justify-start px-0 text-sm font-medium text-teal-700 hover:bg-transparent hover:text-teal-800"
                >
                  <Link href={`/takvim?date=${format(weekStart, "yyyy-MM-dd")}`}>+ Ek Ders Ekle</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {weeklySchedule.map(({ key, day, lessons: dayLessons }) => (
            <Card key={key} className="overflow-hidden border-slate-200 bg-white shadow-sm">
              <div className="bg-slate-800 px-4 py-3 text-white">
                <p className="text-xs text-slate-200">{format(day, "d MMMM", { locale: tr })}</p>
                <p className="text-lg font-semibold capitalize">{format(day, "EEEE", { locale: tr })}</p>
              </div>
              <CardContent className="space-y-3 p-4">
                <div className="space-y-2">
                  {dayLessons.map((lesson) => (
                    <div key={lesson.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {format(toDate(lesson.start_datetime) ?? new Date(), "HH:mm", { locale: tr })} - {lesson.students.full_name}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(lesson.status)}`}
                        >
                          {statusLabel(lesson.status)}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${paymentBadgeClass(lesson.payment_status)}`}
                        >
                          {paymentLabel(lesson.payment_status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <Button asChild variant="ghost" className="h-auto w-full justify-start px-0 text-sm font-medium text-teal-700 hover:bg-transparent hover:text-teal-800">
                  <Link href={`/takvim?date=${format(day, "yyyy-MM-dd")}`}>+ Ek Ders Ekle</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

