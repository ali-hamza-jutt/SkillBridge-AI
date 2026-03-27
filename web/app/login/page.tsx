"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useLoginMutation } from "@/lib/features/auth/authApi";
import { setCredentials } from "@/lib/features/auth/authSlice";
import { useAppDispatch } from "@/lib/hooks";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const [login, { isLoading }] = useLoginMutation();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    try {
      const response = await login({ email, password }).unwrap();
      const userEmail = response.user?.email ?? email;

      dispatch(
        setCredentials({
          token: response.access_token,
          email: userEmail,
        }),
      );

      localStorage.setItem("auth_token", response.access_token);
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
          <h1 className="section-title">Welcome Back</h1>
          <p className="muted-copy mt-2">Log in to access your workspace and continue your tasks.</p>

          <form className="field-stack mt-6" onSubmit={onSubmit}>
            <div>
              <label className="field-label" htmlFor="email">Email</label>
              <input
                id="email"
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
        </section>
      </div>
    </main>
  );
}
