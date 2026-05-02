"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { logout } from "@/lib/features/auth/authSlice";
import { useAppDispatch } from "@/lib/hooks";
import { useUnreadConversationCount } from "@/lib/useUnreadMessages";

type DashboardNavbarProps = {
  role: "FREELANCER" | "HIRER" | "ADMIN" | null;
  activeItem?: "jobs" | "messages" | "profile";
  onPostJob?: () => void;
};

const isActiveClass =
  "border-[color-mix(in_srgb,var(--color-brand)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_66%,var(--color-surface))] text-(--color-brand-strong)";
const defaultClass =
  "border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] text-(--color-text-main)";

export default function DashboardNavbar({ role, activeItem, onPostJob }: DashboardNavbarProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const unreadCount = useUnreadConversationCount();

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
      <div className="mx-auto flex w-[min(100%-4rem,1440px)] items-center justify-between gap-3 py-3">
        <Link href="/dashboard" className="flex items-center no-underline">
          <Image
            src="/logo-light-removebg.png"
            alt="SkillBridge Logo"
            width={200}
            height={56}
            priority
            unoptimized
            className="h-14 w-auto object-contain"
          />
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/messages"
            className={`relative flex items-center justify-center rounded-full border p-2 no-underline ${
              activeItem === "messages" ? isActiveClass : defaultClass
            }`}
            aria-label="Messages"
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--color-brand) px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>

          {role === "FREELANCER" ? (
            <>
              <Link
                href="/dashboard"
                className={`rounded-full border px-4 py-2 text-sm font-semibold no-underline ${
                  activeItem === "jobs" ? isActiveClass : defaultClass
                }`}
              >
                Jobs
              </Link>
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
                className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-brand-soft))] px-5 py-2.5 text-sm font-semibold text-(--color-text-main)"
                type="button"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              {onPostJob ? (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white transition"
                  onClick={onPostJob}
                >
                  Post a Job
                </button>
              ) : null}
              <button
                onClick={signOut}
                className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-brand-soft))] px-5 py-2.5 text-sm font-semibold text-(--color-text-main) transition"
                type="button"
              >
                Log Out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
