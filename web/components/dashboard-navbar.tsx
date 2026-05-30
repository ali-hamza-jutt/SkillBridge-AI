"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, Mail, Search } from "lucide-react";
import { logout } from "@/lib/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useUnreadConversationCount } from "@/lib/useUnreadMessages";

type DashboardNavbarProps = {
  role: "FREELANCER" | "HIRER" | "ADMIN" | null;
  activeItem?: "jobs" | "messages" | "profile";
  onPostJob?: () => void;
};

const AVATAR_COLORS = ["#4f8ef7", "#7c6ef7", "#36b37e", "#f97316", "#e11d48", "#0891b2", "#8b5cf6", "#059669"];

function avatarBg(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const navButtonClass =
  "rounded-full px-4 py-2 text-sm font-semibold text-black no-underline transition hover:bg-transparent hover:text-black";

export default function DashboardNavbar({ role, activeItem, onPostJob }: DashboardNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const unreadCount = useUnreadConversationCount();
  const { avatarUrl, email } = useAppSelector((state) => state.auth);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const initial = (email ?? "U")[0].toUpperCase();
  const bg = avatarBg(email ?? "U");
  const canPostJob = role === "HIRER" && Boolean(onPostJob);

  const signOut = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_email");
    localStorage.removeItem("auth_user_id");
    localStorage.removeItem("auth_role");
    localStorage.removeItem("auth_category_id");
    localStorage.removeItem("auth_skills");
    localStorage.removeItem("auth_avatar_url");
    dispatch(logout());
    router.push("/login");
  };

  const navItems = [
    { label: "Find Work", href: "/dashboard", active: activeItem === "jobs" || pathname === "/dashboard" },
    { label: "Manage Finances", href: "/dashboard/profile", active: activeItem === "profile" || pathname === "/dashboard/profile" },
    { label: "Deliver Work", href: "/dashboard/messages", active: pathname.startsWith("/dashboard/messages") },
    { label: "Messages", href: "/dashboard/messages", active: activeItem === "messages" || pathname.startsWith("/dashboard/messages") },
  ];

  const goToNotifications = () => {
    router.push("/dashboard/messages");
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("search") ?? "").trim();
    const nextParams = new URLSearchParams(searchParams.toString());

    if (query) {
      nextParams.set("q", query);
    } else {
      nextParams.delete("q");
    }

    const nextQuery = nextParams.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const ProfileAvatar = () => (
    <div className="relative" ref={profileMenuRef}>
      <button
        type="button"
        onClick={() => setProfileMenuOpen((open) => !open)}
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition ${
          activeItem === "profile"
            ? "border-(--color-brand)"
            : "border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] hover:border-(--color-brand)"
        }`}
        aria-label="Profile menu"
        aria-expanded={profileMenuOpen}
        aria-haspopup="menu"
      >
        {avatarUrl ? (
          <Image src={avatarUrl} alt="Profile" width={36} height={36} className="h-full w-full object-cover" unoptimized />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: bg }}>
            {initial}
          </span>
        )}
      </button>

      {profileMenuOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-48 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_88%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_96%,transparent)] p-2 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.42)]"
          role="menu"
        >
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-(--color-text-main) no-underline transition hover:bg-[color-mix(in_srgb,var(--color-brand-soft)_55%,transparent)]"
            role="menuitem"
            onClick={() => setProfileMenuOpen(false)}
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand-soft)_70%,var(--color-surface))] text-(--color-brand-strong)">
              <Mail className="h-4 w-4" />
            </span>
            Edit Profile
          </Link>
          <button
            type="button"
            onClick={() => {
              setProfileMenuOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-(--color-text-main) transition hover:bg-[color-mix(in_srgb,var(--color-brand-soft)_55%,transparent)]"
            role="menuitem"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-brand-soft)_70%,var(--color-surface))] text-(--color-brand-strong)">
              <Bell className="h-4 w-4" />
            </span>
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-[color-mix(in_srgb,var(--color-border)_88%,transparent)] bg-[color-mix(in_srgb,var(--color-bg)_84%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1440px] flex-nowrap items-center gap-3 px-4 py-3 sm:px-6 md:gap-4 md:px-8 md:py-4 lg:px-10">
        <Link
          href="/dashboard"
          className="relative inline-flex shrink-0 items-center pl-4 text-lg font-bold text-[var(--color-text-main)] no-underline before:absolute before:left-0 before:top-1 before:h-3 before:w-3 before:rounded-full before:bg-[linear-gradient(145deg,var(--color-brand),var(--color-accent))]"
        >
          SkillBridge
        </Link>

        <div className="min-w-0 flex-1 px-2">
          <div className="flex min-w-0 items-center gap-3 flex-nowrap">
            <nav className="flex min-w-0 flex-wrap items-center gap-2 whitespace-nowrap" aria-label="Dashboard navigation">
              {navItems.map((item) => (
                <Link key={item.label} href={item.href} className={navButtonClass}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex shrink-0 flex-nowrap items-center justify-start gap-2 md:justify-end">
          <form
            className="flex w-[240px] shrink-0 items-center gap-2 rounded-[12px] border border-black bg-transparent px-3 py-1.5"
            onSubmit={handleSearchSubmit}
            role="search"
          >
            <Search className="h-4 w-4 shrink-0 text-(--color-text-muted)" />
            <input
              type="search"
              placeholder="Search jobs, finances, messages"
              aria-label="Search dashboard"
              name="search"
              className="min-w-0 flex-1 bg-transparent text-sm text-(--color-text-main) outline-none placeholder:text-[color-mix(in_srgb,var(--color-text-muted)_82%,transparent)]"
            />
          </form>

          <button
            type="button"
            onClick={goToNotifications}
            className="relative inline-flex items-center justify-center rounded-full border p-2.5 transition border-[color-mix(in_srgb,var(--color-border)_88%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] text-(--color-text-main)"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 shrink-0" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--color-brand) px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </button>

          <ProfileAvatar />

          {canPostJob ? (
            <button
              type="button"
              className="hidden rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-4 py-2.5 text-sm font-semibold text-white transition md:inline-flex"
              onClick={onPostJob}
            >
              Post a Job
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
