"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrencyTRY } from "@/lib/format";

type StudentRow = {
  id: string;
  fullName: string;
  phone: string | null;
  subject: string;
  hourlyRateDefault: string | number;
  status: "AKTIF" | "PASIF";
  balance: {
    remainingDebt: number;
  };
};

export function StudentsTable({
  students,
  onDelete,
}: {
  students: StudentRow[];
  onDelete: (student: StudentRow) => Promise<boolean>;
}) {
  const [studentToDelete, setStudentToDelete] = useState<StudentRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function confirmDelete() {
    if (!studentToDelete) return;

    setIsDeleting(true);
    const deleted = await onDelete(studentToDelete);
    setIsDeleting(false);

    if (deleted) {
      setStudentToDelete(null);
    }
  }

  return (
    <>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Ad</th>
                <th className="px-4 py-3">Telefon</th>
                <th className="px-4 py-3">Ders</th>
                <th className="px-4 py-3">Saat Ücreti</th>
                <th className="px-4 py-3">Kalan Borç</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link className="hover:text-teal-700" href={`/ogrenciler/${student.id}`}>
                      {student.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{student.phone ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{student.subject}</td>
                  <td className="px-4 py-3 text-slate-600">{formatCurrencyTRY(Number(student.hourlyRateDefault))}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{formatCurrencyTRY(student.balance.remainingDebt)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${student.status === "AKTIF" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                      {student.status === "AKTIF" ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      aria-label={`${student.fullName} öğrencisini sil`}
                      onClick={() => setStudentToDelete(student)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(studentToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setStudentToDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Öğrenciyi silmek istiyor musunuz?</DialogTitle>
            <DialogDescription>
              {studentToDelete
                ? `${studentToDelete.fullName} öğrencisi silinecek. Bu işlem geri alınamaz.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStudentToDelete(null)}
              disabled={isDeleting}
            >
              İptal
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Siliniyor..." : "Sil"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
