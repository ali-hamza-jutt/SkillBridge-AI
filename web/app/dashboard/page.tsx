"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, email } = useAppSelector((state) => state.auth);

  const signOut = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_email");
    dispatch(logout());
    router.push("/login");
  };

  if (!token) {
    return (
      <main className="app-root py-10">
        <div className="site-shell">
          <section className="surface-card hero-panel">
            <h1 className="section-title">Dashboard Access Requires Login</h1>
            <p className="muted-copy mt-3">Please log in first to access your personalized dashboard.</p>
            <div className="mt-6 flex gap-3">
              <Link href="/login" className="btn btn-primary">Go to Login</Link>
              <Link href="/signup" className="btn btn-secondary">Create Account</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="app-root py-8">
      <div className="site-shell">
        <nav className="site-nav">
          <Link href="/" className="site-brand">Skill Bridge</Link>
          <button onClick={signOut} className="btn btn-secondary" type="button">Log Out</button>
        </nav>

        <section className="surface-card hero-panel mt-4">
          <h1 className="section-title">Dashboard</h1>
          <p className="muted-copy mt-2">Signed in as <strong>{email ?? "User"}</strong></p>

          <div className="dashboard-grid mt-7">
            <article className="metric-card">
              <p className="metric-label">Active Tasks</p>
              <p className="metric-value">08</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Open Bids</p>
              <p className="metric-value">14</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Unread Notifications</p>
              <p className="metric-value">03</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
