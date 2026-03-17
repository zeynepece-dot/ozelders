import { LoginPage } from "@/components/auth/login-page";
import { redirectAuthenticatedUser } from "@/server/auth";

export default async function GirisPage() {
  await redirectAuthenticatedUser();

  return <LoginPage />;
}
