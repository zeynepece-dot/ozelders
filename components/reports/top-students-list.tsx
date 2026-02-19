import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TopStudent = {
  studentId: string;
  studentName: string;
  lessonCount: number;
  totalHours: number;
};

export function TopStudentsList({ students }: { students: TopStudent[] }) {
  const maxHours = students[0]?.totalHours ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>En Çok Ders Yapılan Öğrenciler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {students.map((student, index) => {
          const percent = (student.totalHours / maxHours) * 100;

          return (
            <div key={student.studentId} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-700">{student.studentName}</span>
                </div>
                <span className="text-slate-500">{student.totalHours.toFixed(1)} saat</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-teal-500" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
        {students.length === 0 ? <p className="text-sm text-slate-500">Bu aralıkta ders kaydı yok.</p> : null}
      </CardContent>
    </Card>
  );
}
