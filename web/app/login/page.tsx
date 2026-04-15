"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthControllerLoginMutation } from "@/lib/api";
import { logout, setCredentials } from "@/lib/features/auth/authSlice";
import { useAppDispatch } from "@/lib/hooks";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [login, { isLoading }] = useAuthControllerLoginMutation();

  useEffect(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_email");
    localStorage.removeItem("auth_user_id");
    localStorage.removeItem("auth_role");
    dispatch(logout());
  }, [dispatch]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") ?? "").trim();
    const submittedPassword = String(formData.get("password") ?? "").trim();

    if (!submittedEmail || !submittedPassword) {
      setStatus("Email and password are required.");
      return;
    }

    try {
      const rawResponse = await login({
        loginDto: {
          email: submittedEmail,
          password: submittedPassword,
        },
      }).unwrap();

      const response = rawResponse as {
        access_token: string;
        refresh_token: string;
        user?: { id?: string; email?: string; role?: "FREELANCER" | "HIRER" | "ADMIN" };
      };

      const userEmail = response.user?.email ?? submittedEmail;
      const userId = response.user?.id ?? null;
      const role = response.user?.role ?? null;

      dispatch(
        setCredentials({
          userId,
          role,
          token: response.access_token,
          refreshToken: response.refresh_token,
          email: userEmail,
        }),
      );

      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("auth_refresh_token", response.refresh_token);
      localStorage.setItem("auth_email", userEmail);
      if (userId) {
        localStorage.setItem("auth_user_id", userId);
      }
      if (role) {
        localStorage.setItem("auth_role", role);
      }

      router.push("/dashboard");
    } catch (error) {
      setStatus(getApiErrorMessage(error, "Login failed. Please verify your credentials."));
    }
  };

  const inputClassName =
    "mt-1 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-main)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--color-text-muted)_86%,transparent)] focus:border-[color-mix(in_srgb,var(--color-brand)_58%,var(--color-border))] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand-soft)_75%,transparent)]";

  return (
    <main
      className="min-h-screen py-8"
      style={{
        background:
          "radial-gradient(circle at 10% 0%, color-mix(in srgb, var(--color-brand-soft) 60%, transparent), transparent 38%), linear-gradient(165deg, var(--color-bg), color-mix(in srgb, var(--color-surface-strong) 84%, var(--color-bg)))",
      }}
    >
      <div className="mx-auto grid w-[min(100%-2rem,1040px)] gap-5">
        <nav className="flex items-center justify-between gap-3 py-2">
          <Link href="/" className="text-lg font-bold tracking-tight text-[var(--color-text-main)] no-underline">
            Skill Bridge
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-brand-soft))] px-4 py-2 text-sm font-semibold text-[var(--color-text-main)] no-underline transition hover:bg-[color-mix(in_srgb,var(--color-surface)_75%,var(--color-brand-soft))]"
          >
            Create account
          </Link>
        </nav>

        <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)] backdrop-blur-md md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.04fr_0.96fr] md:items-start">
            <aside className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[color-mix(in_srgb,var(--color-brand-soft)_42%,var(--color-surface))] p-5">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--color-brand-strong)_90%,var(--color-text-main))]">
                Member Access
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-main)]">Welcome Back</h1>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                Continue from where you left off. Your workspace keeps task flow, bids, and notifications in one place.
              </p>

              <ul className="mt-5 grid gap-2.5 pl-5 text-sm text-[var(--color-text-main)] marker:text-[var(--color-brand)]">
                <li>Track your assigned tasks with a cleaner workflow.</li>
                <li>Receive realtime notifications when task status changes.</li>
                <li>Access dashboard insights powered by modular backend services.</li>
              </ul>
            </aside>

            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_82%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_95%,transparent)] p-5 md:p-6">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">Log In</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">Use your registered email and password.</p>

              <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClassName}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClassName}
                    placeholder="********"
                  />
                </div>

                {status ? (
                  <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger-soft)_80%,var(--color-surface))] px-3 py-2 text-sm text-[var(--color-danger)]">
                    {status}
                  </p>
                ) : null}

                <button
                  className="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-brand-strong)_92%,#0d7000),var(--color-brand))] disabled:cursor-not-allowed disabled:opacity-70"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Log In"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
