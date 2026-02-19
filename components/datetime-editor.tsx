"use client";

import { useEffect, useMemo, useState } from "react";
import { addHours, format } from "date-fns";
import { tr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DateTimeEditorProps = {
  valueStart: string;
  valueEnd: string;
  onApply: (value: { start: string; end: string }) => void;
};

function toDateValue(date: Date) {
  return format(date, "yyyy-MM-dd", { locale: tr });
}

function toTimeValue(date: Date) {
  return format(date, "HH:mm", { locale: tr });
}

function toDurationHours(start: Date, end: Date) {
  return Number(((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2));
}

export function DateTimeEditor({ valueStart, valueEnd, onApply }: DateTimeEditorProps) {
  const [open, setOpen] = useState(false);

  const startDate = useMemo(() => new Date(valueStart), [valueStart]);
  const endDate = useMemo(() => new Date(valueEnd), [valueEnd]);

  const [dateValue, setDateValue] = useState(toDateValue(startDate));
  const [timeValue, setTimeValue] = useState(toTimeValue(startDate));
  const [durationHours, setDurationHours] = useState(toDurationHours(startDate, endDate));

  useEffect(() => {
    setDateValue(toDateValue(startDate));
    setTimeValue(toTimeValue(startDate));
    setDurationHours(toDurationHours(startDate, endDate));
  }, [startDate, endDate]);

  function applyChanges() {
    const [hours, minutes] = timeValue.split(":").map(Number);
    if (!dateValue || !Number.isFinite(hours) || !Number.isFinite(minutes) || durationHours <= 0) {
      return;
    }

    const nextStart = new Date(dateValue);
    nextStart.setHours(hours, minutes, 0, 0);

    const nextEnd = addHours(nextStart, durationHours);
    onApply({ start: nextStart.toISOString(), end: nextEnd.toISOString() });
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="h-auto px-1 py-0 text-xs font-normal text-slate-500 hover:text-slate-700"
        onClick={() => setOpen(true)}
      >
        {format(startDate, "dd.MM.yyyy HH:mm", { locale: tr })}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tarih ve Saat</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tarih</Label>
              <Input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Başlangıç Saati</Label>
              <Input type="time" value={timeValue} onChange={(e) => setTimeValue(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Süre (saat)</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button type="button" onClick={applyChanges}>
              Uygula
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
