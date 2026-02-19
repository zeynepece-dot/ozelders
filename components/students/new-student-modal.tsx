"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { studentCreateSchema, type StudentCreateInput } from "@/lib/validations";
import { SubjectCombobox } from "@/components/subject-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/useSettings";

export function NewStudentModal({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const { data: settings } = useSettings();
  const form = useForm<StudentCreateInput>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: {
      fullName: "",
      subject: "",
      hourlyRateDefault: 0,
      phone: "",
      email: "",
      parentName: "",
      parentPhone: "",
      notes: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const subjectValue = form.watch("subject");

  useEffect(() => {
    if (!open || !settings) return;
    const currentHourlyRate = Number(form.getValues("hourlyRateDefault") ?? 0);
    if (currentHourlyRate > 0) return;
    form.setValue("hourlyRateDefault", Number(settings.default_hourly_rate ?? 0), {
      shouldDirty: false,
    });
  }, [form, open, settings]);

  async function onSubmit(values: StudentCreateInput) {
    const response = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      toast.error("Öğrenci eklenemedi.");
      return;
    }

    toast.success("Öğrenci eklendi.");
    setOpen(false);
    form.reset();
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Yeni Öğrenci Ekle</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Öğrenci Ekle</DialogTitle>
          <DialogDescription>Öğrenci bilgilerini girip kaydedin.</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="space-y-2">
            <Label>Ad Soyad*</Label>
            <Input {...form.register("fullName")} />
          </div>
          <div className="space-y-2">
            <Label>Ders*</Label>
            <input type="hidden" {...form.register("subject")} />
            <SubjectCombobox
              value={subjectValue}
              onChange={(selected) => {
                form.setValue("subject", selected, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
            />
            {form.formState.errors.subject ? (
              <p className="text-xs text-red-600">
                {form.formState.errors.subject.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Saat Ücreti (₺)</Label>
            <Input
              type="number"
              step="0.01"
              {...form.register("hourlyRateDefault", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefon</Label>
            <Input {...form.register("phone")} />
          </div>
          <div className="space-y-2">
            <Label>E-posta</Label>
            <Input type="email" {...form.register("email")} />
          </div>
          <div className="space-y-2">
            <Label>Veli Adı</Label>
            <Input {...form.register("parentName")} />
          </div>
          <div className="space-y-2">
            <Label>Veli Telefon</Label>
            <Input {...form.register("parentPhone")} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              İptal
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 text-white hover:bg-teal-700"
              disabled={isSubmitting}
            >
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
