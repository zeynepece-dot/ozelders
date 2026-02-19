"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export type ProfileResponse = {
  email: string | null;
  full_name: string | null;
  username: string | null;
};

export function useProfile() {
  return useSWR<ProfileResponse>("/api/profile", fetcher);
}
