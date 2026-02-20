import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireApiUser } = vi.hoisted(() => ({
  mockRequireApiUser: vi.fn(),
}));

vi.mock("@/server/api", () => ({
  requireApiUser: mockRequireApiUser,
  unauthorized: () =>
    new Response(JSON.stringify({ error: "Oturum bulunamadı." }), { status: 401 }),
  badRequest: (message: string, details?: unknown) =>
    new Response(JSON.stringify({ error: message, details }), { status: 400 }),
}));

import { GET } from "@/app/api/students/[id]/route";

describe("GET /api/students/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("öğrenci detayında iletişim alanlarını döner", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "11111111-1111-1111-1111-111111111111",
        full_name: "Ayşe Yılmaz",
        subject: "Matematik",
        hourly_rate_default: 750,
        phone: "0555 111 22 33",
        email: "ayse@example.com",
        parent_name: "Fatma Yılmaz",
        parent_phone: "0555 333 44 55",
        notes: null,
        status: "AKTIF",
        lessons: [],
        student_notes: [],
        homework: [],
      },
      error: null,
    });

    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    mockRequireApiUser.mockResolvedValue({
      supabase: { from },
      user: { id: "owner-1" },
    });

    const response = await GET(new Request("http://localhost/api/students/student-1"), {
      params: Promise.resolve({ id: "student-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.phone).toBe("0555 111 22 33");
    expect(body.email).toBe("ayse@example.com");
    expect(body.parent_name).toBe("Fatma Yılmaz");
    expect(body.parent_phone).toBe("0555 333 44 55");
  });
});
