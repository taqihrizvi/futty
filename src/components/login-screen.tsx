"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNextPath } from "@/lib/session";

export function LoginScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const next = safeNextPath(search.get("next"));
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      const data = (await response.json()) as { error?: string; next?: string };
      if (!response.ok) {
        setError(data.error ?? "Email or password is not correct.");
        setPending(false);
        return;
      }
      router.replace(safeNextPath(data.next));
      router.refresh();
    } catch {
      setError("Contour Arena could not reach the sign-in service.");
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-xl bg-surface-container-lowest p-8 shadow-sm"
      >
        <h1 className="sr-only">Contour Arena</h1>
        <img src="/logo.png" alt="" width={1774} height={887} className="mx-auto h-auto w-full max-w-xs" />
        <p className="mt-6 text-on-surface-variant">
          Sign in with your email and password to open the tournament desk.
        </p>
        <label className="mt-6 grid gap-2 text-label-md text-on-surface" htmlFor="email">
          Email
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-12 rounded-lg bg-surface-container-low px-4 text-body-lg font-normal"
          />
        </label>
        <label className="mt-4 grid gap-2 text-label-md text-on-surface" htmlFor="password">
          Password
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-12 rounded-lg bg-surface-container-low px-4 text-body-lg font-normal"
          />
        </label>
        {error ? <p className="mt-3 text-body-sm text-error">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-lg bg-primary text-label-lg text-on-primary disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
