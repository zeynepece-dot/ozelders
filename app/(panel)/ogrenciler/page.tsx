"use client";

import { PageHeader } from "@/components/layout/page-header";
import { NewStudentModal } from "@/components/students/new-student-modal";
import { StudentsTable } from "@/components/students/students-table";
import { useStudents, type StudentsListItem } from "@/hooks/useStudents";

export default function OgrencilerPage() {
  const { data: students = [], mutate } = useStudents<StudentsListItem[]>();

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Öğrenciler" subtitle="Öğrenci listesi ve borç durumu" />
        <NewStudentModal onCreated={() => mutate()} />
      </div>
      <StudentsTable students={students} />
    </section>
  );
}
