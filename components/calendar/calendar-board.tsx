"use client";

import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import trLocale from "@fullcalendar/core/locales/tr";
import { addDays, addHours, format } from "date-fns";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrencyTRY, formatDateTimeTR } from "@/lib/format";
import { DateTimeEditor } from "@/components/datetime-editor";
import { useCalendarNotes } from "@/hooks/useCalendarNotes";
import { useLessons, type LessonApiResponse } from "@/hooks/useLessons";
import { useStudents } from "@/hooks/useStudents";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RecurrenceScope = "THIS" | "THIS_AND_FUTURE" | "ALL";

type Student = {
  id: string;
  full_name: string;
  subject: string | null;
  hourly_rate_default: number;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  color?: string;
  display?: "auto" | "background";
  allDay?: boolean;
  classNames?: string[];
  extendedProps: {
    kind: "lesson" | "note" | "holiday";
    studentId?: string;
    recurrenceId?: string | null;
    recurrenceLabel?: string | null;
    status?: "PLANLANDI" | "YAPILDI" | "GELMEDI" | "IPTAL";
    paymentStatus?: "ODENDI" | "ODENMEDI" | "KISMI";
    amountPaid?: number;
    durationHours?: number;
    hourlyRate?: number;
    noShowFeeRule?: "UCRET_ALINMAZ" | "YARIM_UCRET" | "TAM_UCRET";
    note: string;
  };
};

type EditorState = {
  id?: string;
  studentId: string;
  recurrenceId?: string | null;
  recurrenceLabel?: string | null;
  startDateTime: string;
  endDateTime: string;
  durationHours: number;
  hourlyRate: number;
  status: "PLANLANDI" | "YAPILDI" | "GELMEDI" | "IPTAL";
  paymentStatus: "ODENDI" | "ODENMEDI" | "KISMI";
  amountPaid: number;
  noShowFeeRule: "UCRET_ALINMAZ" | "YARIM_UCRET" | "TAM_UCRET";
  note: string;
};

type EventLike = {
  id: string;
  start: Date | null;
  end: Date | null;
  extendedProps: CalendarEvent["extendedProps"];
};

const DEFAULT_STATE: EditorState = {
  studentId: "",
  recurrenceId: null,
  recurrenceLabel: null,
  startDateTime: new Date().toISOString(),
  endDateTime: addHours(new Date(), 1).toISOString(),
  durationHours: 1,
  hourlyRate: 0,
  status: "PLANLANDI",
  paymentStatus: "ODENMEDI",
  amountPaid: 0,
  noShowFeeRule: "UCRET_ALINMAZ",
  note: "",
};

function getRecurrenceLabel(
  relation: LessonApiResponse["recurrences"],
): string | null {
  const recurrence = Array.isArray(relation) ? relation[0] : relation;
  if (!recurrence) return null;
  if (recurrence.frequency === "BIWEEKLY" || recurrence.interval_weeks === 2) return "Seri: 2 Haftada Bir";
  return "Seri: Haftalık";
}

export function CalendarBoard() {
  const [editor, setEditor] = useState<EditorState>(DEFAULT_STATE);
  const [open, setOpen] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [scopeDraft, setScopeDraft] = useState<RecurrenceScope>("THIS");
  const [originalEditor, setOriginalEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);

  const scrollTime = useMemo(() => {
    const now = new Date();
    const hour = Math.max(now.getHours() - 1, 0);
    return `${String(hour).padStart(2, "0")}:00:00`;
  }, []);

  const isRecurring = Boolean(editor.recurrenceId);
  const scopeIsBulk = isRecurring && scopeDraft !== "THIS";
  const {
    data: students = [],
    error: studentsError,
    isLoading: studentsLoading,
  } = useStudents<Student[]>("AKTIF");
  const { data: lessons = [], mutate: mutateLessons } = useLessons();
  const { data: notes = [] } = useCalendarNotes();
  const { data: settings } = useSettings();
  const datetimeChanged =
    Boolean(originalEditor) &&
    (editor.startDateTime !== originalEditor?.startDateTime ||
      editor.endDateTime !== originalEditor?.endDateTime);
  const recurringDatetimeChanged = isRecurring && datetimeChanged;
  const workdayStart = settings?.workday_start ?? "08:00";
  const workdayEnd = settings?.workday_end ?? "22:00";
  const weekStart = settings?.week_start ?? 1;
  const hideWeekends = settings?.hide_weekends ?? false;
  const holidays = useMemo(
    () => (Array.isArray(settings?.holidays) ? settings.holidays : []),
    [settings?.holidays],
  );
  const defaultHourlyRate = Number(settings?.default_hourly_rate ?? 0);
  const defaultNoShowFeeRule =
    settings?.default_no_show_fee_rule ?? "UCRET_ALINMAZ";

  useEffect(() => {
    if (recurringDatetimeChanged && scopeDraft !== "THIS") {
      setScopeDraft("THIS");
    }
  }, [recurringDatetimeChanged, scopeDraft]);

  function buildDefaultEditor(startDate: Date): EditorState {
    return {
      ...DEFAULT_STATE,
      startDateTime: startDate.toISOString(),
      endDateTime: addHours(startDate, 1).toISOString(),
      hourlyRate: defaultHourlyRate,
      noShowFeeRule: defaultNoShowFeeRule,
    };
  }

  const events = useMemo<CalendarEvent[]>(() => {
    const lessonEvents: CalendarEvent[] = lessons
      .filter((lesson) => showCancelled || lesson.status !== "IPTAL")
      .map((lesson) => ({
      id: lesson.id,
      title: `${lesson.students.full_name} - ${Number(lesson.duration_hours).toFixed(1)} saat`,
      start: lesson.start_datetime,
      end: lesson.end_datetime,
      extendedProps: {
        kind: "lesson",
        studentId: lesson.student_id,
        recurrenceId: lesson.recurrence_id,
        recurrenceLabel: getRecurrenceLabel(lesson.recurrences),
        status: lesson.status,
        paymentStatus: lesson.payment_status,
        amountPaid: Number(lesson.amount_paid),
        durationHours: Number(lesson.duration_hours),
        hourlyRate: Number(lesson.hourly_rate),
        noShowFeeRule: lesson.no_show_fee_rule,
        note: lesson.note ?? "",
      },
    }));

    const noteEvents: CalendarEvent[] = notes.map((note) => ({
      id: note.id,
      title: `Not: ${note.title}`,
      start: note.start_datetime,
      end: note.end_datetime,
      extendedProps: {
        kind: "note",
        note: note.note ?? "",
      },
    }));

    const holidayEvents: CalendarEvent[] = holidays.map((holiday) => ({
      id: `holiday-${holiday}`,
      title: "Tatil",
      start: holiday,
      end: format(addDays(new Date(`${holiday}T00:00:00`), 1), "yyyy-MM-dd"),
      allDay: true,
      display: "background",
      classNames: ["fc-holiday-bg"],
      extendedProps: {
        kind: "holiday",
        note: "Tatil",
      },
    }));

    return [...lessonEvents, ...noteEvents, ...holidayEvents];
  }, [holidays, lessons, notes, showCancelled]);

  useEffect(() => {
    if (studentsError) {
      toast.error("Öğrenciler yüklenemedi.");
    }
  }, [studentsError]);

  function openForEvent(event: EventLike) {
    if (event.extendedProps.kind !== "lesson") {
      return;
    }

    const nextEditor: EditorState = {
      id: event.id,
      studentId: event.extendedProps.studentId ?? "",
      recurrenceId: event.extendedProps.recurrenceId ?? null,
      recurrenceLabel: event.extendedProps.recurrenceLabel ?? null,
      startDateTime: event.start?.toISOString() ?? new Date().toISOString(),
      endDateTime: event.end?.toISOString() ?? addHours(new Date(), 1).toISOString(),
      durationHours: event.extendedProps.durationHours ?? 1,
      hourlyRate: event.extendedProps.hourlyRate ?? 0,
      status: event.extendedProps.status ?? "PLANLANDI",
      paymentStatus: event.extendedProps.paymentStatus ?? "ODENMEDI",
      amountPaid: event.extendedProps.amountPaid ?? 0,
      noShowFeeRule: event.extendedProps.noShowFeeRule ?? "UCRET_ALINMAZ",
      note: event.extendedProps.note,
    };

    setEditor(nextEditor);
    setOriginalEditor(nextEditor);
    setScopeDraft("THIS");
    setOpen(true);
  }

  async function saveSingleLesson() {
    const method = editor.id ? "PATCH" : "POST";
    const endpoint = editor.id ? `/api/lessons/${editor.id}` : "/api/lessons";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editor),
    });

    if (!response.ok) {
      toast.error("Ders kaydedilemedi.");
      return;
    }

    await mutateLessons();
    setOriginalEditor(editor);
    toast.success(editor.id ? "Ders güncellendi." : "Ders eklendi.");

    if (!editor.id) {
      setOpen(false);
      setEditor(buildDefaultEditor(new Date()));
      setOriginalEditor(null);
    }
  }

  async function applyScopeUpdate() {
    if (!editor.id) return;

    setSaving(true);
    const patch: Record<string, unknown> = {
      student_id: editor.studentId,
      duration_hours: editor.durationHours,
      status: editor.status,
      no_show_fee_rule: editor.noShowFeeRule,
      hourly_rate: editor.hourlyRate,
      payment_status: editor.paymentStatus,
      amount_paid: editor.amountPaid,
      note: editor.note,
    };

    if (datetimeChanged) {
      patch.start_datetime = editor.startDateTime;
      patch.end_datetime = editor.endDateTime;
    }

    const response = await fetch(`/api/lessons/${editor.id}/apply-scope`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope: scopeDraft,
        patch,
      }),
    });
    setSaving(false);

    const payload = await response.json();

    if (!response.ok) {
      toast.error(payload?.error ?? "Kapsam güncellemesi başarısız.");
      return;
    }

    if (Array.isArray(payload.warnings)) {
      payload.warnings.forEach((warning: string) => toast.warning(warning));
    }

    if (payload.scope === "THIS") toast.success("Sadece bu ders güncellendi.");
    if (payload.scope === "THIS_AND_FUTURE") toast.success("Bu ve sonraki dersler güncellendi.");
    if (payload.scope === "ALL") toast.success("Tüm seri güncellendi.");

    if (payload.scope !== "THIS" && originalEditor) {
      setEditor((prev) => ({
        ...prev,
        startDateTime: originalEditor.startDateTime,
        endDateTime: originalEditor.endDateTime,
        paymentStatus: originalEditor.paymentStatus,
        amountPaid: originalEditor.amountPaid,
        note: originalEditor.note,
      }));
    }

    setOriginalEditor((prev) =>
      prev
        ? {
            ...prev,
            studentId: editor.studentId,
            durationHours: editor.durationHours,
            hourlyRate: editor.hourlyRate,
            status: editor.status,
            noShowFeeRule: editor.noShowFeeRule,
            ...(payload.scope === "THIS"
              ? {
                  startDateTime: editor.startDateTime,
                  endDateTime: editor.endDateTime,
                  paymentStatus: editor.paymentStatus,
                  amountPaid: editor.amountPaid,
                  note: editor.note,
                }
              : {}),
          }
        : editor,
    );

    setScopeDialogOpen(false);
    await mutateLessons();
  }

  async function saveLesson() {
    if (!editor.id || !editor.recurrenceId) {
      await saveSingleLesson();
      return;
    }

    if (recurringDatetimeChanged) {
      setScopeDraft("THIS");
    }
    setScopeDialogOpen(true);
  }

  function selectScope(nextScope: RecurrenceScope) {
    if (recurringDatetimeChanged && nextScope !== "THIS") {
      toast.warning("Tarih/saat toplu kaydırma desteklenmiyor.");
      setScopeDraft("THIS");
      return;
    }
    setScopeDraft(nextScope);
  }

  async function deleteLesson() {
    if (!editor.id) return;
    await fetch(`/api/lessons/${editor.id}`, { method: "DELETE" });
    setOpen(false);
    setEditor(buildDefaultEditor(new Date()));
    setOriginalEditor(null);
    toast.success("Ders silindi.");
    await mutateLessons();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
          />
          İptal edilenleri göster
        </label>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridDay,timeGridWeek,dayGridMonth",
          }}
          buttonText={{
            today: "Bugün",
            day: "Gün",
            week: "Hafta",
            month: "Ay",
          }}
          locale={trLocale}
          allDaySlot={false}
          nowIndicator
          slotDuration="00:30:00"
          slotMinTime={`${workdayStart}:00`}
          slotMaxTime={`${workdayEnd}:00`}
          scrollTime={scrollTime}
          firstDay={weekStart}
          hiddenDays={hideWeekends ? [0, 6] : []}
          events={events}
          eventClassNames={(arg) => {
            const kind = arg.event.extendedProps.kind as
              | "lesson"
              | "note"
              | "holiday"
              | undefined;

            if (kind === "holiday") return ["fc-holiday-bg"];
            if (kind !== "lesson") return [];

            const status = arg.event.extendedProps.status as
              | "PLANLANDI"
              | "YAPILDI"
              | "GELMEDI"
              | "IPTAL"
              | undefined;
            const paymentStatus = arg.event.extendedProps.paymentStatus as
              | "ODENDI"
              | "ODENMEDI"
              | "KISMI"
              | undefined;

            if (status === "GELMEDI") return ["status-noshow"];
            if (status === "IPTAL") return ["status-cancelled"];
            if (paymentStatus === "ODENDI") return ["status-paid"];
            if (paymentStatus === "KISMI") return ["status-partial"];
            return ["status-unpaid"];
          }}
          dateClick={(arg) => {
            const clickedDay = format(arg.date, "yyyy-MM-dd");
            if (holidays.includes(clickedDay)) {
              const confirmed = window.confirm(
                "Bu gün tatil olarak işaretli. Yine de ders eklemek istiyor musunuz?",
              );
              if (!confirmed) return;
            }

            const nextEditor = buildDefaultEditor(arg.date);
            setEditor(nextEditor);
            setOriginalEditor(nextEditor);
            setScopeDraft("THIS");
            setOpen(true);
          }}
          eventClick={(arg) => openForEvent(arg.event as unknown as EventLike)}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: false }}
          height="75vh"
        />
      </div>

      {open ? (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-white p-5 shadow-2xl">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-xl font-semibold">Ders Detayı</h3>
            {isRecurring ? (
              <>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                  Tekrarlayan ders
                </span>
                {editor.recurrenceLabel ? (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                    {editor.recurrenceLabel}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="mb-4">
            <DateTimeEditor
              valueStart={editor.startDateTime}
              valueEnd={editor.endDateTime}
              onApply={({ start, end }) => {
                const startMs = new Date(start).getTime();
                const endMs = new Date(end).getTime();
                const nextDurationHours = Number(((endMs - startMs) / (1000 * 60 * 60)).toFixed(2));

                const hasConflict = events.some((event) => {
                  if (event.extendedProps.kind !== "lesson" || event.id === editor.id) return false;
                  const eventStart = new Date(event.start).getTime();
                  const eventEnd = new Date(event.end).getTime();
                  return startMs < eventEnd && endMs > eventStart;
                });

                if (hasConflict) {
                  toast.warning("Bu saat aralığında başka bir ders var.");
                }

                setEditor((prev) => ({
                  ...prev,
                  startDateTime: start,
                  endDateTime: end,
                  durationHours: nextDurationHours,
                }));
              }}
            />
            <p className="mt-1 text-xs text-slate-400">{formatDateTimeTR(editor.startDateTime)}</p>
          </div>

          {isRecurring ? (
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-medium text-slate-600">Kapsam (ön seçim)</p>
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" size="sm" variant={scopeDraft === "THIS" ? "default" : "outline"} onClick={() => setScopeDraft("THIS")}>
                  Sadece bu
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={scopeDraft === "THIS_AND_FUTURE" ? "default" : "outline"}
                  onClick={() => selectScope("THIS_AND_FUTURE")}
                  disabled={recurringDatetimeChanged}
                  title={recurringDatetimeChanged ? "Tarih/saat değişikliği yalnızca bu derse uygulanabilir." : ""}
                >
                  Bu+Sonraki
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={scopeDraft === "ALL" ? "default" : "outline"}
                  onClick={() => selectScope("ALL")}
                  disabled={recurringDatetimeChanged}
                  title={recurringDatetimeChanged ? "Tarih/saat değişikliği yalnızca bu derse uygulanabilir." : ""}
                >
                  Tüm seri
                </Button>
              </div>
              {scopeIsBulk ? (
                <p className="mt-2 text-xs text-amber-700">
                  Toplu güncellemede ödeme ve not alanları tek ders için düzenlenebilir.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3 overflow-y-auto pb-28">
            <div className="space-y-1">
              <Label>Öğrenci</Label>
              {studentsLoading ? (
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
              ) : (
                <Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={studentPickerOpen}
                      className="w-full justify-between"
                    >
                      {students.find((student) => student.id === editor.studentId)?.full_name ??
                        "Öğrenci seç"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Öğrenci ara..." />
                      <CommandList>
                        <CommandEmpty>Öğrenci bulunamadı</CommandEmpty>
                        <CommandGroup>
                          {students.map((student) => (
                            <CommandItem
                              key={student.id}
                              value={`${student.full_name} ${student.subject ?? ""}`}
                              onSelect={() => {
                                setEditor((prev) => ({
                                  ...prev,
                                  studentId: student.id,
                                  hourlyRate: Number(student.hourly_rate_default ?? 0),
                                }));
                                setStudentPickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  editor.studentId === student.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{student.full_name}</span>
                                <span className="text-xs text-slate-500">
                                  {student.subject ? `${student.subject} • ` : ""}
                                  {formatCurrencyTRY(Number(student.hourly_rate_default ?? 0))}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Durum</Label>
                <select
                  className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                  value={editor.status}
                  onChange={(e) => setEditor((prev) => ({ ...prev, status: e.target.value as EditorState["status"] }))}
                >
                  <option value="PLANLANDI">Planlandı</option>
                  <option value="YAPILDI">Yapıldı</option>
                  <option value="GELMEDI">Gelmedi</option>
                  <option value="IPTAL">İptal</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Ödeme</Label>
                <select
                  title={scopeIsBulk ? "Ödeme bilgileri tek ders için güncellenebilir." : ""}
                  disabled={scopeIsBulk}
                  className="h-10 w-full rounded-xl border border-input px-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  value={editor.paymentStatus}
                  onChange={(e) => setEditor((prev) => ({ ...prev, paymentStatus: e.target.value as EditorState["paymentStatus"] }))}
                >
                  <option value="ODENDI">Ödendi</option>
                  <option value="ODENMEDI">Ödenmedi</option>
                  <option value="KISMI">Kısmi</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Süre (saat)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editor.durationHours}
                  onChange={(e) => {
                    const nextDurationHours = Number(e.target.value);
                    if (!Number.isFinite(nextDurationHours) || nextDurationHours <= 0) {
                      setEditor((prev) => ({ ...prev, durationHours: 0 }));
                      return;
                    }
                    setEditor((prev) => ({
                      ...prev,
                      durationHours: nextDurationHours,
                      endDateTime: addHours(new Date(prev.startDateTime), nextDurationHours).toISOString(),
                    }));
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Kısmi Ödeme</Label>
                <Input
                  title={scopeIsBulk ? "Ödeme bilgileri tek ders için güncellenebilir." : ""}
                  disabled={scopeIsBulk}
                  className="disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  type="number"
                  step="0.01"
                  value={editor.amountPaid}
                  onChange={(e) => setEditor((prev) => ({ ...prev, amountPaid: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Saat Ücreti</Label>
              <Input
                type="number"
                step="0.01"
                value={editor.hourlyRate}
                onChange={(e) => setEditor((prev) => ({ ...prev, hourlyRate: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label>No-show ücret kuralı</Label>
              <select
                className="h-10 w-full rounded-xl border border-input px-3 text-sm"
                value={editor.noShowFeeRule}
                onChange={(e) => setEditor((prev) => ({ ...prev, noShowFeeRule: e.target.value as EditorState["noShowFeeRule"] }))}
              >
                <option value="UCRET_ALINMAZ">Ücret Alınmaz</option>
                <option value="YARIM_UCRET">Yarım Ücret</option>
                <option value="TAM_UCRET">Tam Ücret</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Ders Notu</Label>
              <Textarea
                title={scopeIsBulk ? "Ders notu yalnızca tek ders için güncellenebilir." : ""}
                disabled={scopeIsBulk}
                className="disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                value={editor.note}
                onChange={(e) => setEditor((prev) => ({ ...prev, note: e.target.value }))}
              />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t bg-white p-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Kapat
            </Button>
            <div className="flex gap-2">
              {editor.id ? (
                <Button variant="destructive" onClick={deleteLesson}>
                  Sil
                </Button>
              ) : null}
              <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={saveLesson}>
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Değişiklik hangi derslere uygulansın?</DialogTitle>
            <DialogDescription>
              Tekrarlayan derslerde kapsam seçimi zorunludur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-2 rounded-lg border p-3">
              <input type="radio" checked={scopeDraft === "THIS"} onChange={() => selectScope("THIS")} />
              <span>Sadece bu ders</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border p-3">
              <input
                type="radio"
                checked={scopeDraft === "THIS_AND_FUTURE"}
                onChange={() => selectScope("THIS_AND_FUTURE")}
                disabled={recurringDatetimeChanged}
              />
              <span>Bu ve sonraki dersler</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border p-3">
              <input type="radio" checked={scopeDraft === "ALL"} onChange={() => selectScope("ALL")} disabled={recurringDatetimeChanged} />
              <span>Tüm seri</span>
            </label>

            {scopeDraft !== "THIS" && recurringDatetimeChanged ? (
              <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                Bu ve sonraki derslerde saat/tarih toplu kaydırma bu sürümde desteklenmiyor. Yalnızca ücret/süre/durum/öğrenci gibi alanlar güncellenir.
              </p>
            ) : null}
            {recurringDatetimeChanged ? (
              <p className="rounded-lg bg-blue-50 p-2 text-xs text-blue-700">
                Tarih/saat değiştiği için kapsam otomatik olarak &quot;Sadece bu ders&quot; ile sınırlandı.
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setScopeDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={applyScopeUpdate} disabled={saving}>
              {saving ? "Uygulanıyor..." : "Uygula"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
