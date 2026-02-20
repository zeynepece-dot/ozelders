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
import { Textarea } from "@/components/ui/textarea";

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
  email: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  lessons: Lesson[];
};

type StudentNote = {
  id: string;
  text: string;
  created_at: string;
  updated_at: string;
};

type HomeworkItem = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "BEKLIYOR" | "TAMAMLANDI";
  created_at: string;
  updated_at: string;
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
  { value: 2, label: "Salı" },
  { value: 3, label: "Çarşamba" },
  { value: 4, label: "Perşembe" },
  { value: 5, label: "Cuma" },
  { value: 6, label: "Cumartesi" },
  { value: 0, label: "Pazar" },
];

function statusLabel(status: Lesson["status"]) {
  if (status === "PLANLANDI") return "Planlandı";
  if (status === "YAPILDI") return "Yapıldı";
  if (status === "GELMEDI") return "Gelmedi";
  return "İptal";
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
  const [homeworkFilter, setHomeworkFilter] = useState<
    "BEKLIYOR" | "TAMAMLANDI" | "ALL"
  >("BEKLIYOR");
  const { data: studentNotes = [], mutate: mutateStudentNotes } = useSWR<StudentNote[]>(
    studentId ? `/api/students/${studentId}/notes` : null,
    fetcher,
  );
  const { data: homeworkItems = [], mutate: mutateHomework } = useSWR<HomeworkItem[]>(
    studentId ? `/api/students/${studentId}/homework?status=${homeworkFilter}` : null,
    fetcher,
  );

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
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteEditId, setNoteEditId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [quickNoteSaving, setQuickNoteSaving] = useState(false);
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);
  const [homeworkEditId, setHomeworkEditId] = useState<string | null>(null);
  const [homeworkTitle, setHomeworkTitle] = useState("");
  const [homeworkDescription, setHomeworkDescription] = useState("");
  const [homeworkDueDate, setHomeworkDueDate] = useState("");
  const [homeworkSaving, setHomeworkSaving] = useState(false);
  const [quickHomeworkTitle, setQuickHomeworkTitle] = useState("");
  const [isCreatingHomework, setIsCreatingHomework] = useState(false);

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

  function openNoteDialog(note?: StudentNote) {
    if (note) {
      setNoteEditId(note.id);
      setNoteText(note.text);
    } else {
      setNoteEditId(null);
      setNoteText("");
    }
    setNoteDialogOpen(true);
  }

  async function saveNote() {
    if (!studentId) return;
    if (!noteText.trim()) {
      toast.error("Not metni zorunludur.");
      return;
    }

    setNoteSaving(true);
    const endpoint = noteEditId ? `/api/notes/${noteEditId}` : `/api/students/${studentId}/notes`;
    const method = noteEditId ? "PATCH" : "POST";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: noteText.trim() }),
    });
    setNoteSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      toast.error(payload?.error ?? "Not kaydedilemedi.");
      return;
    }

    await mutateStudentNotes();
    setNoteDialogOpen(false);
    setNoteEditId(null);
    setNoteText("");
    toast.success(noteEditId ? "Not güncellendi." : "Not eklendi.");
  }

  async function deleteNote(noteId: string) {
    const confirmed = window.confirm("Bu notu silmek istediğinize emin misiniz?");
    if (!confirmed) return;

    const response = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      toast.error(payload?.error ?? "Not silinemedi.");
      return;
    }

    await mutateStudentNotes();
    toast.success("Not silindi.");
  }

  async function addQuickNote() {
    if (!studentId) return;
    const text = quickNote.trim();
    if (!text) {
      toast.warning("Lütfen bir not yazın.");
      return;
    }
    if (text.length < 2) {
      toast.warning("Not en az 2 karakter olmalı.");
      return;
    }

    setQuickNoteSaving(true);
    const response = await fetch(`/api/students/${studentId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setQuickNoteSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      toast.error(payload?.error ?? "Not eklenemedi.");
      return;
    }

    setQuickNote("");
    await mutateStudentNotes();
    toast.success("Not eklendi.");
  }

  function openHomeworkDialog(item?: HomeworkItem) {
    if (item) {
      setHomeworkEditId(item.id);
      setHomeworkTitle(item.title);
      setHomeworkDescription(item.description ?? "");
      setHomeworkDueDate(item.due_date ?? "");
    } else {
      setHomeworkEditId(null);
      setHomeworkTitle("");
      setHomeworkDescription("");
      setHomeworkDueDate("");
    }
    setHomeworkDialogOpen(true);
  }

  async function saveHomework() {
    if (!studentId) return;
    if (!homeworkTitle.trim()) {
      toast.error("Ödev başlığı zorunludur.");
      return;
    }

    setHomeworkSaving(true);
    const endpoint = homeworkEditId
      ? `/api/homework/${homeworkEditId}`
      : `/api/students/${studentId}/homework`;
    const method = homeworkEditId ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: homeworkTitle.trim(),
        description: homeworkDescription.trim() || "",
        due_date: homeworkDueDate || "",
      }),
    });
    setHomeworkSaving(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      toast.error(payload?.error ?? "Ödev kaydedilemedi.");
      return;
    }

    await mutateHomework();
    setHomeworkDialogOpen(false);
    setHomeworkEditId(null);
    setHomeworkTitle("");
    setHomeworkDescription("");
    setHomeworkDueDate("");
    toast.success(homeworkEditId ? "Ödev güncellendi." : "Ödev eklendi.");
  }

  async function deleteHomework(homeworkId: string) {
    const confirmed = window.confirm("Bu ödevi silmek istediğinize emin misiniz?");
    if (!confirmed) return;

    const response = await fetch(`/api/homework/${homeworkId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      toast.error(payload?.error ?? "Ödev silinemedi.");
      return;
    }

    await mutateHomework();
    toast.success("Ödev silindi.");
  }

  async function toggleHomeworkStatus(item: HomeworkItem) {
    const nextStatus = item.status === "TAMAMLANDI" ? "BEKLIYOR" : "TAMAMLANDI";
    const response = await fetch(`/api/homework/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      toast.error(payload?.error ?? "Ödev durumu güncellenemedi.");
      return;
    }

    await mutateHomework();
    toast.success(
      nextStatus === "TAMAMLANDI"
        ? "Ödev tamamlandı."
        : "Ödev tekrar beklemeye alındı.",
    );
  }

  async function addQuickHomework() {
    if (!studentId) return;
    const title = quickHomeworkTitle.trim();
    if (!title) {
      toast.warning("Lütfen ödev başlığı yazın.");
      return;
    }

    setIsCreatingHomework(true);
    const response = await fetch(`/api/students/${studentId}/homework`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setIsCreatingHomework(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      toast.error(payload?.error ?? "Ödev eklenemedi.");
      return;
    }

    setQuickHomeworkTitle("");
    await mutateHomework();
    toast.success("Ödev eklendi.");
  }

  async function createSingleLesson() {
    if (!studentId || !singleDate || !singleTime) {
      toast.error("Lütfen tarih ve saat alanlarını doldurun.");
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
      toast.error("Lütfen zorunlu alanları doldurun.");
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
      toast.error(payload?.error ?? "Haftalık seri oluşturulamadı.");
      return;
    }

    setRecurrenceDialogOpen(false);
    await mutate();
    await mutateRecurrences();
    toast.success(`Haftalık seri oluşturuldu. ${payload.created_count} ders eklendi.`);
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
      toast.error(payload?.error ?? "Seri durdurulamadı.");
      return;
    }

    setStopDialogOpen(false);
    await Promise.all([mutate(), mutateRecurrences()]);
    toast.success(payload?.message ?? "Seri durduruldu.");
  }

  if (error) {
    return <section className="text-sm text-red-600">Öğrenci bilgisi alınamadı.</section>;
  }

  if (!student) {
    return <section className="text-sm text-slate-500">Yükleniyor...</section>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{student.full_name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Genel / Dersler / Notlar / Ödevler
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={openWeeklyDialog}>
            Haftalık Tekrarlayan Ders Saati Oluştur
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
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <div className="space-y-2">
              <p>Ders: {student.subject || "-"}</p>
              <p>Saat Ücreti: {formatCurrencyTRY(Number(student.hourly_rate_default))}</p>
            </div>
            <div className="space-y-2">
              <p>Telefon: {student.phone || "-"}</p>
              <p>E-posta: {student.email || "-"}</p>
              <p>Veli Adı: {student.parent_name || "-"}</p>
              <p>Veli Telefon: {student.parent_phone || "-"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Notlar</CardTitle>
              <Button size="sm" variant="outline" onClick={() => openNoteDialog()}>
                + Not Ekle
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="space-y-2">
              <Label>Hızlı Not</Label>
              <Textarea
                className="min-h-[80px]"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void addQuickNote();
                  }
                }}
                placeholder="Derse dair kısa not yaz…"
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={addQuickNote} disabled={quickNoteSaving}>
                  {quickNoteSaving ? "Ekleniyor..." : "Ekle"}
                </Button>
              </div>
            </div>
            <div className="border-t border-slate-200" />

            {studentNotes.length === 0 ? (
              <div className="space-y-1">
                <p className="text-slate-500">Not bulunmuyor.</p>
                <p className="text-xs text-slate-400">Not ekleyin.</p>
              </div>
            ) : (
              studentNotes.map((note) => (
                <div key={note.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="whitespace-pre-wrap text-slate-700">{note.text}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateTimeTR(note.created_at)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openNoteDialog(note)}>
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:text-rose-700"
                      onClick={() => deleteNote(note.id)}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <div className="space-y-2">
                <Label>Hızlı Ödev</Label>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    value={quickHomeworkTitle}
                    onChange={(e) => setQuickHomeworkTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void addQuickHomework();
                      }
                    }}
                    placeholder="Örn: 20 soru çöz, paragraf testi, konu tekrarı…"
                  />
                  <Button
                    type="button"
                    onClick={addQuickHomework}
                    disabled={isCreatingHomework}
                  >
                    {isCreatingHomework ? "Ekleniyor..." : "Ekle"}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Ödevler</CardTitle>
                <Button size="sm" variant="outline" onClick={() => openHomeworkDialog()}>
                  + Ödev Ekle
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={homeworkFilter === "BEKLIYOR" ? "default" : "outline"}
                  onClick={() => setHomeworkFilter("BEKLIYOR")}
                >
                  Bekleyenler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={homeworkFilter === "ALL" ? "default" : "outline"}
                  onClick={() => setHomeworkFilter("ALL")}
                >
                  Tümü
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={homeworkFilter === "TAMAMLANDI" ? "default" : "outline"}
                  onClick={() => setHomeworkFilter("TAMAMLANDI")}
                >
                  Tamamlananlar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {homeworkItems.length === 0 ? (
              <p className="text-slate-500">Ödev bulunmuyor.</p>
            ) : (
              homeworkItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">{item.title}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        item.status === "TAMAMLANDI"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.status === "TAMAMLANDI" ? "Tamamlandı" : "Bekliyor"}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="mb-2 whitespace-pre-wrap text-xs text-slate-600">
                      {item.description}
                    </p>
                  ) : null}
                  {item.due_date ? (
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      Son: {format(new Date(`${item.due_date}T00:00:00`), "dd.MM.yyyy")}
                    </span>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 rounded-lg border px-2 py-1 text-xs">
                      <input
                        type="checkbox"
                        checked={item.status === "TAMAMLANDI"}
                        onChange={() => toggleHomeworkStatus(item)}
                      />
                      <span>Tamamlandı</span>
                    </label>
                    <Button size="sm" variant="outline" onClick={() => openHomeworkDialog(item)}>
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:text-rose-700"
                      onClick={() => deleteHomework(item.id)}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
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
              <TabsTrigger value="upcoming">Yaklaşan</TabsTrigger>
              <TabsTrigger value="history">Geçmiş</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-3 space-y-2 text-sm">
              {upcomingLessons.length === 0 ? (
                <p className="text-slate-500">Yaklaşan ders bulunmuyor.</p>
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
                <p className="text-slate-500">Geçmiş ders bulunmuyor.</p>
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
            <p className="text-slate-500">Bu öğrenci için tekrarlayan seri yok.</p>
          ) : (
            recurrences.map((recurrence) => (
              <div
                key={recurrence.id}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">
                      {recurrence.interval_weeks === 2 ? "2 Haftada Bir" : "Haftalık"}
                    </p>
                    <p className="text-slate-600">
                      Gün: {weekdayLabel(recurrence.weekdays[0] ?? 1)} • Saat:{" "}
                      {format(new Date(recurrence.start_datetime), "HH:mm")} • Süre:{" "}
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

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{noteEditId ? "Notu Düzenle" : "Not Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Not</Label>
            <Textarea
              rows={5}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Not metnini yazın..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={saveNote} disabled={noteSaving}>
              {noteSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={homeworkDialogOpen} onOpenChange={setHomeworkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{homeworkEditId ? "Ödevi Düzenle" : "Ödev Ekle"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Başlık</Label>
              <Input
                value={homeworkTitle}
                onChange={(e) => setHomeworkTitle(e.target.value)}
                placeholder="Ödev başlığı"
              />
            </div>
            <div className="space-y-1">
              <Label>Açıklama (opsiyonel)</Label>
              <Textarea
                rows={4}
                value={homeworkDescription}
                onChange={(e) => setHomeworkDescription(e.target.value)}
                placeholder="Açıklama"
              />
            </div>
            <div className="space-y-1">
              <Label>Son tarih (opsiyonel)</Label>
              <Input
                type="date"
                value={homeworkDueDate}
                onChange={(e) => setHomeworkDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setHomeworkDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={saveHomework} disabled={homeworkSaving}>
              {homeworkSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <Label>Başlangıç saati</Label>
              <Input type="time" value={singleTime} onChange={(e) => setSingleTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Süre (saat)</Label>
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
                <option value="PLANLANDI">Planlandı</option>
                <option value="YAPILDI">Yapıldı</option>
                <option value="GELMEDI">Gelmedi</option>
                <option value="IPTAL">İptal</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Ödeme durumu</Label>
              <select
                className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                value={singlePayment}
                onChange={(e) =>
                  setSinglePayment(e.target.value as "ODENDI" | "ODENMEDI" | "KISMI")
                }
              >
                <option value="ODENMEDI">Ödenmedi</option>
                <option value="ODENDI">Ödendi</option>
                <option value="KISMI">Kısmi</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Saat ücreti</Label>
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
              İptal
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
              <DialogTitle>Haftalık Tekrarlayan Ders Saati Oluştur</DialogTitle>
            </DialogHeader>

            <div className="ios-scroll flex-1 overflow-y-auto px-4 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Gün seçimi</Label>
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
                  <Label>Süre (saat)</Label>
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
                  <Label>Başlangıç tarihi</Label>
                  <Input
                    type="date"
                    value={weeklyStartDate}
                    onChange={(e) => setWeeklyStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Bitiş tarihi (opsiyonel)</Label>
                  <Input type="date" value={weeklyEndDate} onChange={(e) => setWeeklyEndDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Tekrar sayısı (opsiyonel)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Örn: 12"
                    value={weeklyCount}
                    onChange={(e) => setWeeklyCount(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Saat ücreti</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={weeklyHourlyRate}
                    onChange={(e) => setWeeklyHourlyRate(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>No-show kuralı</Label>
                  <select
                    className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                    value={weeklyNoShowRule}
                    onChange={(e) =>
                      setWeeklyNoShowRule(
                        e.target.value as "UCRET_ALINMAZ" | "YARIM_UCRET" | "TAM_UCRET",
                      )
                    }
                  >
                    <option value="UCRET_ALINMAZ">Ücret Alınmaz</option>
                    <option value="YARIM_UCRET">Yarım Ücret</option>
                    <option value="TAM_UCRET">Tam Ücret</option>
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
                İptal
              </Button>
              <Button onClick={createWeeklySeries} disabled={savingSeries}>
                {savingSeries ? "Oluşturuluyor..." : "Kaydet"}
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
            Bu seri durdurulduğunda, seçtiğiniz tarihten itibaren dersler iptal edilir.
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
              İptal
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



