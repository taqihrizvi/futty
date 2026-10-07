import { Suspense } from "react";
import { LoginScreen } from "@/components/login-screen";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="px-4 pt-10 text-on-surface">Opening sign in…</p>}>
      <LoginScreen />
    </Suspense>
  );
}
