export function computeMonthlyStats(rows: Array<Record<string, unknown>>) {
  const totalLessonHours = rows.reduce((sum, row) => sum + Number(row.duration_hours ?? 0), 0);
  const collected = rows.reduce((sum, row) => sum + Number(row.amount_paid ?? 0), 0);
  const receivable = rows.reduce(
    (sum, row) => sum + Number(row.fee_total ?? 0) - Number(row.amount_paid ?? 0),
    0,
  );

  const statMap = new Map<string, { studentName: string; lessonCount: number; totalHours: number }>();

  rows.forEach((row) => {
    const studentId = String(row.student_id);
    const studentsValue = row.students as { full_name?: string } | Array<{ full_name?: string }> | null;
    const studentRelation = Array.isArray(studentsValue) ? studentsValue[0] : studentsValue;
    const current = statMap.get(studentId);

    if (!current) {
      statMap.set(studentId, {
        studentName: studentRelation?.full_name ?? "Bilinmeyen",
        lessonCount: 1,
        totalHours: Number(row.duration_hours ?? 0),
      });
      return;
    }

    current.lessonCount += 1;
    current.totalHours += Number(row.duration_hours ?? 0);
  });

  const topStudents = [...statMap.entries()]
    .map(([studentId, value]) => ({ studentId, ...value }))
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 5);

  return {
    totalLessonHours: Number(totalLessonHours.toFixed(1)),
    collected: Number(collected.toFixed(2)),
    receivable: Number(receivable.toFixed(2)),
    topStudents,
  };
}
