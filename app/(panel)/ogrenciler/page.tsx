"use client";

import { Info } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { NewStudentModal } from "@/components/students/new-student-modal";
import { StudentsTable } from "@/components/students/students-table";
import { useStudents, type StudentsListItem } from "@/hooks/useStudents";

export default function OgrencilerPage() {
  const { data: students = [], mutate } = useStudents<StudentsListItem[]>();

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageHeader title="Öğrenciler" subtitle="Öğrenci listesi ve borç durumu" />
          <div className="-mt-3 flex items-start gap-2 pl-[72px] text-sm text-slate-500 md:pl-0">
            <Info className="mt-0.5 h-4 w-4 text-slate-400" />
            <p>Ders planlamak için öğrenciyi seçin.</p>
          </div>
        </div>
        <NewStudentModal onCreated={() => mutate()} />
      </div>
      <StudentsTable students={students} />
    </section>
  );
}
