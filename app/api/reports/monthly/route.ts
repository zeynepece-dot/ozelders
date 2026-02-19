export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { reportRangeSchema } from "@/lib/validations";
import { getMonthlyReport } from "@/server/repositories/report-repository";
import { badRequest, requireApiUser, unauthorized } from "@/server/api";

const READ_CACHE_HEADERS = { "Cache-Control": "private, max-age=30" };

export async function GET(request: Request) {
  const { user } = await requireApiUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const parsed = reportRangeSchema.safeParse({
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
  });

  if (!parsed.success) {
    return badRequest("Rapor filtreleri geçersiz.", parsed.error.flatten());
  }

  const report = await getMonthlyReport(parsed.data);
  return NextResponse.json(report, { headers: READ_CACHE_HEADERS });
}
