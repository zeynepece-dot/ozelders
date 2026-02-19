import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const READ_CACHE_HEADERS = { "Cache-Control": "private, max-age=30" };

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (error) {
      return NextResponse.json(
        { hasAccount: true },
        { headers: READ_CACHE_HEADERS },
      );
    }

    return NextResponse.json(
      { hasAccount: (data.users?.length ?? 0) > 0 },
      { headers: READ_CACHE_HEADERS },
    );
  } catch {
    return NextResponse.json({ hasAccount: true }, { headers: READ_CACHE_HEADERS });
  }
}
