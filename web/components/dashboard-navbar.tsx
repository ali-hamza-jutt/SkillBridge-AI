"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/features/auth/authSlice";
import { useAppDispatch } from "@/lib/hooks";

type DashboardNavbarProps = {
  role: "FREELANCER" | "HIRER" | "ADMIN" | null;
  activeItem?: "jobs" | "profile";
  onPostJob?: () => void;
};

const isActiveClass = "border-[color-mix(in_srgb,var(--color-brand)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_66%,var(--color-surface))] text-[var(--color-brand-strong)]";
const defaultClass = "border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] text-[var(--color-text-main)]";

export default function DashboardNavbar({ role, activeItem, onPostJob }: DashboardNavbarProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const signOut = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_email");
    localStorage.removeItem("auth_user_id");
    localStorage.removeItem("auth_role");
    localStorage.removeItem("auth_category_id");
    localStorage.removeItem("auth_skills");
    dispatch(logout());
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-[color-mix(in_srgb,var(--color-border)_88%,transparent)] bg-[color-mix(in_srgb,var(--color-bg)_84%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex w-[min(100%-2rem,1200px)] items-center justify-between gap-3 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-[var(--color-text-main)] no-underline">
          SkillBridge
        </Link>

        {role === "FREELANCER" ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className={`rounded-full border px-4 py-2 text-sm font-semibold no-underline ${
                activeItem === "jobs" ? isActiveClass : defaultClass
              }`}
            >
              Jobs
            </Link>
            <button className={`rounded-full border px-4 py-2 text-sm font-semibold ${defaultClass}`} type="button">
              Messages
            </button>
            <Link
              href="/dashboard/profile"
              className={`rounded-full border px-4 py-2 text-sm font-semibold no-underline ${
                activeItem === "profile" ? isActiveClass : defaultClass
              }`}
            >
              Profile
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-brand-soft))] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-main)]"
              type="button"
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {onPostJob ? (
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-brand-strong)_92%,#0d7000),var(--color-brand))]"
                onClick={onPostJob}
              >
                Post a Job
              </button>
            ) : null}
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-brand-soft))] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-main)] transition hover:bg-[color-mix(in_srgb,var(--color-surface)_75%,var(--color-brand-soft))]"
              type="button"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
