"use client";

import { useMemo, useState } from "react";
import { addHours, format } from "date-fns";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { formatCurrencyTRY, formatDateTimeTR } from "@/lib/format";
import { useSettings } from "@/hooks/useSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Lesson = {
  id: string;
  start_datetime: string;
  status: "PLANLANDI" | "YAPILDI" | "GELMEDI" | "IPTAL";
  fee_total: number | string;
  payment_status?: "ODENDI" | "ODENMEDI" | "KISMI";
  duration_hours?: number | string;
  note?: string | null;
};

type StudentDetailResponse = {
  id: string;
  full_name: string;
  subject: string;
  hourly_rate_default: number | string;
  phone: string | null;
  student_notes: Array<{ id: string; text: string }>;
  homework: Array<{ id: string; title: string; status: "BEKLIYOR" | "TAMAMLANDI" }>;
  lessons: Lesson[];
};

type StudentRecurrence = {
  id: string;
  interval_weeks: number;
  weekdays: number[];
  start_datetime: string;
  end_date: string | null;
  repeat_count: number | null;
  created_at: string;
  is_active: boolean;
  next_lesson_datetime: string | null;
  future_count: number;
  duration_hours: number;
};

const DURATION_OPTIONS = [1, 1.5, 2];

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Pazartesi" },
  { value: 2, label: "SalÄ±" },
  { value: 3, label: "Ã‡arÅŸamba" },
  { value: 4, label: "PerÅŸembe" },
  { value: 5, label: "Cuma" },
  { value: 6, label: "Cumartesi" },
  { value: 0, label: "Pazar" },
];

function statusLabel(status: Lesson["status"]) {
  if (status === "PLANLANDI") return "PlanlandÄ±";
  if (status === "YAPILDI") return "YapÄ±ldÄ±";
  if (status === "GELMEDI") return "Gelmedi";
  return "Ä°ptal";
}

function weekdayLabel(day: number) {
  return WEEKDAY_OPTIONS.find((item) => item.value === day)?.label ?? "-";
}

function nextWeekdayDate(weekday: number) {
  const base = new Date();
  const diff = (weekday - base.getDay() + 7) % 7;
  const next = new Date(base);
  next.setDate(base.getDate() + diff);
  return format(next, "yyyy-MM-dd");
}

export default function OgrenciDetayPage() {
  const params = useParams<{ id: string }>();
  const studentId = String(params.id ?? "");
  const { data: settings } = useSettings();
  const { data: student, error, mutate } = useSWR<StudentDetailResponse>(
    studentId ? `/api/students/${studentId}` : null,
    fetcher,
  );
  const { data: recurrences = [], mutate: mutateRecurrences } = useSWR<
    StudentRecurrence[]
  >(studentId ? `/api/students/${studentId}/recurrences` : null, fetcher);

  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [recurrenceDialogOpen, setRecurrenceDialogOpen] = useState(false);
  const [savingSingle, setSavingSingle] = useState(false);
  const [savingSeries, setSavingSeries] = useState(false);
  const [lessonTab, setLessonTab] = useState<"upcoming" | "history">("upcoming");
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [selectedRecurrenceId, setSelectedRecurrenceId] = useState<string | null>(null);
  const [stopMode, setStopMode] = useState<"NEXT" | "DATE">("NEXT");
  const [stopDate, setStopDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [stopping, setStopping] = useState(false);

  const [singleDate, setSingleDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [singleTime, setSingleTime] = useState("18:00");
  const [singleDuration, setSingleDuration] = useState<number>(1);
  const [singleStatus, setSingleStatus] = useState<Lesson["status"]>("PLANLANDI");
  const [singlePayment, setSinglePayment] = useState<"ODENDI" | "ODENMEDI" | "KISMI">("ODENMEDI");
  const [singleHourlyRate, setSingleHourlyRate] = useState(0);
  const [singleNoShowRule, setSingleNoShowRule] = useState<"UCRET_ALINMAZ" | "YARIM_UCRET" | "TAM_UCRET">("UCRET_ALINMAZ");
  const [singleNote, setSingleNote] = useState("");

  const [weeklyWeekday, setWeeklyWeekday] = useState<number>(1);
  const [weeklyTime, setWeeklyTime] = useState("18:00");
  const [weeklyDuration, setWeeklyDuration] = useState<number>(1);
  const [weeklyStartDate, setWeeklyStartDate] = useState(nextWeekdayDate(1));
  const [weeklyEndDate, setWeeklyEndDate] = useState("");
  const [weeklyCount, setWeeklyCount] = useState<string>("");
  const [weeklyHourlyRate, setWeeklyHourlyRate] = useState(0);
  const [weeklyNoShowRule, setWeeklyNoShowRule] = useState<"UCRET_ALINMAZ" | "YARIM_UCRET" | "TAM_UCRET">("UCRET_ALINMAZ");
  const [weeklyNote, setWeeklyNote] = useState("");

  const computedDefaultRate = useMemo(() => {
    const studentRate = Number(student?.hourly_rate_default ?? 0);
    if (studentRate > 0) return studentRate;
    return Number(settings?.default_hourly_rate ?? 0);
  }, [settings?.default_hourly_rate, student?.hourly_rate_default]);

  const computedNoShowRule = useMemo(
    () => settings?.default_no_show_fee_rule ?? "UCRET_ALINMAZ",
    [settings?.default_no_show_fee_rule],
  );

  const upcomingLessons = useMemo(() => {
    if (!student?.lessons) return [];
    const now = Date.now();
    return [...student.lessons]
      .filter((lesson) => new Date(lesson.start_datetime).getTime() >= now)
      .filter((lesson) => lesson.status !== "IPTAL")
      .sort(
        (a, b) =>
          new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime(),
      );
  }, [student?.lessons]);

  const historyLessons = useMemo(() => {
    if (!student?.lessons) return [];
    const now = Date.now();
    return [...student.lessons]
      .filter((lesson) => new Date(lesson.start_datetime).getTime() < now)
      .filter((lesson) => lesson.status !== "IPTAL")
      .sort(
        (a, b) =>
          new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime(),
      );
  }, [student?.lessons]);

  function openSingleDialog() {
    setSingleDate(format(new Date(), "yyyy-MM-dd"));
    setSingleTime("18:00");
    setSingleDuration(1);
    setSingleStatus("PLANLANDI");
    setSinglePayment("ODENMEDI");
    setSingleHourlyRate(computedDefaultRate);
    setSingleNoShowRule(computedNoShowRule);
    setSingleNote("");
    setLessonDialogOpen(true);
  }

  function openWeeklyDialog() {
    setWeeklyWeekday(1);
    setWeeklyTime("18:00");
    setWeeklyDuration(1);
    setWeeklyStartDate(nextWeekdayDate(1));
    setWeeklyEndDate("");
    setWeeklyCount("");
    setWeeklyHourlyRate(computedDefaultRate);
    setWeeklyNoShowRule(computedNoShowRule);
    setWeeklyNote("");
    setRecurrenceDialogOpen(true);
  }

  async function createSingleLesson() {
    if (!studentId || !singleDate || !singleTime) {
      toast.error("LÃ¼tfen tarih ve saat alanlarÄ±nÄ± doldurun.");
      return;
    }

    const start = new Date(`${singleDate}T${singleTime}:00`);
    const end = addHours(start, singleDuration);

    setSavingSingle(true);
    const response = await fetch("/api/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        durationHours: singleDuration,
        status: singleStatus,
        paymentStatus: singlePayment,
        amountPaid: 0,
        hourlyRate: Number(singleHourlyRate),
        noShowFeeRule: singleNoShowRule,
        note: singleNote,
      }),
    });
    setSavingSingle(false);

    if (!response.ok) {
      toast.error("Tek ders eklenemedi.");
      return;
    }

    setLessonDialogOpen(false);
    await mutate();
    toast.success("Tek ders eklendi.");
  }

  async function createWeeklySeries() {
    if (!studentId || !weeklyTime || !weeklyStartDate) {
      toast.error("LÃ¼tfen zorunlu alanlarÄ± doldurun.");
      return;
    }

    setSavingSeries(true);
    const response = await fetch("/api/recurrences/create-weekly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
        weekday: weeklyWeekday,
        time: weeklyTime,
        duration_hours: weeklyDuration,
        start_date: weeklyStartDate,
        end_date: weeklyEndDate || undefined,
        count: weeklyCount ? Number(weeklyCount) : undefined,
        hourly_rate: Number(weeklyHourlyRate),
        no_show_fee_rule: weeklyNoShowRule,
        note: weeklyNote,
      }),
    });
    setSavingSeries(false);

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error(payload?.error ?? "HaftalÄ±k seri oluÅŸturulamadÄ±.");
      return;
    }

    setRecurrenceDialogOpen(false);
    await mutate();
    await mutateRecurrences();
    toast.success(`HaftalÄ±k seri oluÅŸturuldu. ${payload.created_count} ders eklendi.`);
  }

  function openStopDialog(recurrenceId: string) {
    setSelectedRecurrenceId(recurrenceId);
    setStopMode("NEXT");
    setStopDate(format(new Date(), "yyyy-MM-dd"));
    setStopDialogOpen(true);
  }

  async function stopSeries() {
    if (!selectedRecurrenceId) return;
    setStopping(true);
    const response = await fetch("/api/recurrences/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recurrence_id: selectedRecurrenceId,
        stop_mode: stopMode,
        stop_date: stopMode === "DATE" ? stopDate : undefined,
      }),
    });
    setStopping(false);

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      toast.error(payload?.error ?? "Seri durdurulamadÄ±.");
      return;
    }

    setStopDialogOpen(false);
    await Promise.all([mutate(), mutateRecurrences()]);
    toast.success(payload?.message ?? "Seri durduruldu.");
  }

  if (error) {
    return <section className="text-sm text-red-600">Ã–ÄŸrenci bilgisi alÄ±namadÄ±.</section>;
  }

  if (!student) {
    return <section className="text-sm text-slate-500">YÃ¼kleniyor...</section>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{student.full_name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Genel / Dersler / Notlar / Ã–devler
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={openWeeklyDialog}>
            HaftalÄ±k Tekrarlayan Ders Saati OluÅŸtur
          </Button>
          <Button variant="outline" onClick={openSingleDialog}>
            Tek Ders Randevu Ekle
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Genel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Ders: {student.subject}</p>
            <p>Saat Ãœcreti: {formatCurrencyTRY(Number(student.hourly_rate_default))}</p>
            <p>Telefon: {student.phone ?? "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(student.student_notes ?? []).length === 0 ? (
              <p className="text-slate-500">Not bulunmuyor.</p>
            ) : (
              (student.student_notes ?? []).map((note) => <p key={note.id}>- {note.text}</p>)
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ã–devler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(student.homework ?? []).length === 0 ? (
              <p className="text-slate-500">Ã–dev bulunmuyor.</p>
            ) : (
              (student.homework ?? []).map((homework) => (
                <p key={homework.id}>
                  - {homework.title} ({homework.status === "BEKLIYOR" ? "Bekliyor" : "TamamlandÄ±"})
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dersler</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={lessonTab}
            onValueChange={(value) => setLessonTab(value as "upcoming" | "history")}
          >
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="upcoming">YaklaÅŸan</TabsTrigger>
              <TabsTrigger value="history">GeÃ§miÅŸ</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-3 space-y-2 text-sm">
              {upcomingLessons.length === 0 ? (
                <p className="text-slate-500">YaklaÅŸan ders bulunmuyor.</p>
              ) : (
                upcomingLessons.map((lesson) => (
                  <div key={lesson.id} className="flex justify-between border-b py-2">
                    <span>{formatDateTimeTR(lesson.start_datetime)}</span>
                    <span>{statusLabel(lesson.status)}</span>
                    <span>{formatCurrencyTRY(Number(lesson.fee_total))}</span>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-3 space-y-2 text-sm">
              {historyLessons.length === 0 ? (
                <p className="text-slate-500">GeÃ§miÅŸ ders bulunmuyor.</p>
              ) : (
                historyLessons.map((lesson) => (
                  <div key={lesson.id} className="flex justify-between border-b py-2">
                    <span>{formatDateTimeTR(lesson.start_datetime)}</span>
                    <span>{statusLabel(lesson.status)}</span>
                    <span>{formatCurrencyTRY(Number(lesson.fee_total))}</span>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seriler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {recurrences.length === 0 ? (
            <p className="text-slate-500">Bu Ã¶ÄŸrenci iÃ§in tekrarlayan seri yok.</p>
          ) : (
            recurrences.map((recurrence) => (
              <div
                key={recurrence.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">
                      {recurrence.interval_weeks === 2 ? "2 Haftada Bir" : "HaftalÄ±k"}
                    </p>
                    <p className="text-slate-600">
                      GÃ¼n: {weekdayLabel(recurrence.weekdays[0] ?? 1)} â€¢ Saat:{" "}
                      {format(new Date(recurrence.start_datetime), "HH:mm")} â€¢ SÃ¼re:{" "}
                      {Number(recurrence.duration_hours).toFixed(1)} saat
                    </p>
                    <p className="text-xs text-slate-500">
                      Gelecek ders: {recurrence.future_count}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-xs text-slate-500">
                      Sonraki ders:{" "}
                      {recurrence.next_lesson_datetime
                        ? formatDateTimeTR(recurrence.next_lesson_datetime)
                        : "-"}
                    </p>
                    <Button
                      variant="outline"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => openStopDialog(recurrence.id)}
                    >
                      Seriyi Durdur
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tek Ders Randevu Ekle</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Tarih</Label>
              <Input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>BaÅŸlangÄ±Ã§ saati</Label>
              <Input type="time" value={singleTime} onChange={(e) => setSingleTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>SÃ¼re (saat)</Label>
              <select
                className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                value={singleDuration}
                onChange={(e) => setSingleDuration(Number(e.target.value))}
              >
                {DURATION_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Durum</Label>
              <select
                className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                value={singleStatus}
                onChange={(e) => setSingleStatus(e.target.value as Lesson["status"])}
              >
                <option value="PLANLANDI">PlanlandÄ±</option>
                <option value="YAPILDI">YapÄ±ldÄ±</option>
                <option value="GELMEDI">Gelmedi</option>
                <option value="IPTAL">Ä°ptal</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Ã–deme durumu</Label>
              <select
                className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                value={singlePayment}
                onChange={(e) =>
                  setSinglePayment(e.target.value as "ODENDI" | "ODENMEDI" | "KISMI")
                }
              >
                <option value="ODENMEDI">Ã–denmedi</option>
                <option value="ODENDI">Ã–dendi</option>
                <option value="KISMI">KÄ±smi</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Saat Ã¼creti</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={singleHourlyRate}
                onChange={(e) => setSingleHourlyRate(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Not</Label>
              <Input value={singleNote} onChange={(e) => setSingleNote(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>
              Ä°ptal
            </Button>
            <Button onClick={createSingleLesson} disabled={savingSingle}>
              {savingSingle ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={recurrenceDialogOpen} onOpenChange={setRecurrenceDialogOpen}>
        <DialogContent className="max-w-xl gap-0 p-0">
          <div className="flex h-[calc(100dvh-56px)] max-h-[calc(100dvh-56px)] flex-col">
            <DialogHeader className="border-b px-4 py-4 pr-12">
              <DialogTitle>HaftalÄ±k Tekrarlayan Ders Saati OluÅŸtur</DialogTitle>
            </DialogHeader>

            <div className="ios-scroll flex-1 overflow-y-auto px-4 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>GÃ¼n seÃ§imi</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                    value={weeklyWeekday}
                    onChange={(e) => {
                      const nextWeekday = Number(e.target.value);
                      setWeeklyWeekday(nextWeekday);
                      setWeeklyStartDate(nextWeekdayDate(nextWeekday));
                    }}
                  >
                    {WEEKDAY_OPTIONS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Saat</Label>
                  <Input type="time" value={weeklyTime} onChange={(e) => setWeeklyTime(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>SÃ¼re (saat)</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                    value={weeklyDuration}
                    onChange={(e) => setWeeklyDuration(Number(e.target.value))}
                  >
                    {DURATION_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>BaÅŸlangÄ±Ã§ tarihi</Label>
                  <Input
                    type="date"
                    value={weeklyStartDate}
                    onChange={(e) => setWeeklyStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>BitiÅŸ tarihi (opsiyonel)</Label>
                  <Input type="date" value={weeklyEndDate} onChange={(e) => setWeeklyEndDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Tekrar sayÄ±sÄ± (opsiyonel)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Ã–rn: 12"
                    value={weeklyCount}
                    onChange={(e) => setWeeklyCount(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Saat Ã¼creti</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={weeklyHourlyRate}
                    onChange={(e) => setWeeklyHourlyRate(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>No-show kuralÄ±</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                    value={weeklyNoShowRule}
                    onChange={(e) =>
                      setWeeklyNoShowRule(
                        e.target.value as "UCRET_ALINMAZ" | "YARIM_UCRET" | "TAM_UCRET",
                      )
                    }
                  >
                    <option value="UCRET_ALINMAZ">Ãœcret AlÄ±nmaz</option>
                    <option value="YARIM_UCRET">YarÄ±m Ãœcret</option>
                    <option value="TAM_UCRET">Tam Ãœcret</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Not</Label>
                  <Input value={weeklyNote} onChange={(e) => setWeeklyNote(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white/80 px-4 py-4 backdrop-blur">
              <Button variant="outline" onClick={() => setRecurrenceDialogOpen(false)}>
                Ä°ptal
              </Button>
              <Button onClick={createWeeklySeries} disabled={savingSeries}>
                {savingSeries ? "OluÅŸturuluyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seriyi Durdur</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Bu seri durdurulduÄŸunda, seÃ§tiÄŸiniz tarihten itibaren dersler iptal edilir.
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <input
                type="radio"
                checked={stopMode === "NEXT"}
                onChange={() => setStopMode("NEXT")}
              />
              <span>Bir sonraki dersten itibaren</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <input
                type="radio"
                checked={stopMode === "DATE"}
                onChange={() => setStopMode("DATE")}
              />
              <span>Belirli bir tarihten itibaren</span>
            </label>
            {stopMode === "DATE" ? (
              <div className="space-y-1">
                <Label>Tarih</Label>
                <Input
                  type="date"
                  value={stopDate}
                  onChange={(e) => setStopDate(e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStopDialogOpen(false)}>
              Ä°ptal
            </Button>
            <Button variant="destructive" onClick={stopSeries} disabled={stopping}>
              {stopping ? "Durduruluyor..." : "Seriyi Durdur"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

