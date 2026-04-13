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
        user?: { email?: string };
      };

      const userEmail = response.user?.email ?? submittedEmail;

      dispatch(
        setCredentials({
          token: response.access_token,
          refreshToken: response.refresh_token,
          email: userEmail,
        }),
      );

      localStorage.setItem("auth_token", response.access_token);
      localStorage.setItem("auth_refresh_token", response.refresh_token);
      localStorage.setItem("auth_email", userEmail);

      router.push("/dashboard");
    } catch (error) {
      setStatus(getApiErrorMessage(error, "Login failed. Please verify your credentials."));
    }
  };

  return (
    <main className="app-root py-8">
      <div className="site-shell">
        <nav className="site-nav">
          <Link href="/" className="site-brand">Skill Bridge</Link>
          <Link href="/signup" className="btn btn-secondary">Create account</Link>
        </nav>

        <section className="surface-card form-shell">
          <div className="auth-grid">
            <aside className="auth-info">
              <p className="section-kicker">Member Access</p>
              <h1 className="section-title mt-2">Welcome Back</h1>
              <p className="muted-copy mt-3">Continue from where you left off. Your workspace keeps task flow, bids, and notifications in one place.</p>

              <ul className="auth-list">
                <li>Track your assigned tasks with a cleaner workflow.</li>
                <li>Receive realtime notifications when task status changes.</li>
                <li>Access dashboard insights powered by modular backend services.</li>
              </ul>
            </aside>

            <div className="auth-form">
              <h2 className="section-title">Log In</h2>
              <p className="muted-copy mt-2">Use your registered email and password.</p>

              <form className="field-stack mt-6" onSubmit={onSubmit}>
                <div>
                  <label className="field-label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field-input"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="password">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-input"
                    placeholder="••••••••"
                  />
                </div>

                {status ? <p className="status-error">{status}</p> : null}

                <button className="btn btn-primary w-full" type="submit" disabled={isLoading}>
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
