"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bell, LogOut, MessageSquareText, Search, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { logout } from "@/lib/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useUnreadConversationCount } from "@/lib/useUnreadMessages";
import { useNavigationLoading } from "@/components/navigation-loading-provider";

type DashboardNavbarProps = {
  role: "FREELANCER" | "HIRER" | "ADMIN" | null;
  activeItem?: "jobs" | "messages" | "profile";
  onPostJob?: () => void;
};

type ProfileAvatarProps = {
  activeItem?: "jobs" | "messages" | "profile";
  avatarUrl?: string | null;
  email?: string | null;
  profileMenuOpen: boolean;
  profileMenuRef: RefObject<HTMLDivElement | null>;
  setProfileMenuOpen: (open: boolean | ((current: boolean) => boolean)) => void;
  signOut: () => void;
};

function ProfileAvatar({
  activeItem,
  avatarUrl,
  email,
  profileMenuOpen,
  profileMenuRef,
  setProfileMenuOpen,
  signOut,
}: ProfileAvatarProps) {
  const initial = (email ?? "U")[0].toUpperCase();

  return (
    <div className="relative" ref={profileMenuRef}>
      <button
        type="button"
        onClick={() => setProfileMenuOpen((open) => !open)}
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border transition ${
          activeItem === "profile"
            ? "border-(--color-brand)"
            : "border-(--color-border) hover:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))]"
        }`}
        aria-label="Profile menu"
        aria-expanded={profileMenuOpen}
        aria-haspopup="menu"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Profile"
            width={36}
            height={36}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-(--color-brand) text-sm font-bold text-white">
            {initial}
          </span>
        )}
      </button>

      {profileMenuOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+0.55rem)] z-50 w-52 overflow-hidden rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-surface) p-1.5 shadow-(--shadow-panel)"
          role="menu"
        >
          <div className="border-b border-(--color-border) px-3 py-2">
            <p className="truncate text-xs font-semibold text-(--color-text-main)">{email ?? "Your account"}</p>
            <p className="mt-0.5 text-[11px] text-(--color-text-muted)">Account settings</p>
          </div>
          <Link
            href="/dashboard/profile"
            className="mt-1 flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-(--color-text-main) no-underline transition hover:bg-(--color-hover)"
            role="menuitem"
            onClick={() => setProfileMenuOpen(false)}
          >
            <UserRound className="h-4 w-4 text-(--color-text-muted)" />
            Edit profile
          </Link>
          <button
            type="button"
            onClick={() => {
              setProfileMenuOpen(false);
              signOut();
            }}
            className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-medium text-(--color-danger) transition hover:bg-[color-mix(in_srgb,var(--color-danger)_6%,transparent)]"
            role="menuitem"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardNavbar({ role, activeItem, onPostJob }: DashboardNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const unreadCount = useUnreadConversationCount();
  const { startRouteLoading } = useNavigationLoading();
  const { avatarUrl, email } = useAppSelector((state) => state.auth);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const canPostJob = role === "HIRER" && Boolean(onPostJob);
  const navItems = [
    {
      label: role === "HIRER" ? "Dashboard" : "Find Work",
      href: "/dashboard",
      active: activeItem === "jobs" || pathname === "/dashboard",
    },
    {
      label: "Finances",
      href: "/dashboard/profile",
      active: activeItem === "profile" || pathname === "/dashboard/profile",
    },
    {
      label: "Messages",
      href: "/dashboard/messages",
      active: activeItem === "messages" || pathname.startsWith("/dashboard/messages"),
    },
  ];

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
    startRouteLoading("/login");
    router.push("/login");
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("search") ?? "").trim();
    const nextParams = new URLSearchParams(searchParams.toString());

    if (query) nextParams.set("q", query);
    else nextParams.delete("q");

    const nextQuery = nextParams.toString();
    const destination = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    startRouteLoading(destination);
    router.push(destination);
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

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-(--color-border) bg-(--color-surface)">
      <div className="mx-auto flex h-full w-full max-w-[1500px] items-center gap-3 px-3 sm:px-5 lg:px-6">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5 text-(--color-text-main) no-underline">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-(--color-brand) text-white shadow-(--shadow-sm)">
            <MessageSquareText className="h-4.5 w-4.5" />
          </span>
          <span className="hidden text-base font-bold tracking-tight sm:inline">SkillBridge</span>
        </Link>

        <nav className="ml-2 hidden min-w-0 items-center gap-1 md:flex" aria-label="Dashboard navigation">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`relative inline-flex h-9 items-center rounded-[var(--radius-sm)] px-3 text-sm font-semibold no-underline transition-colors ${
                item.active
                  ? "bg-(--color-brand-soft) text-(--color-brand)"
                  : "text-(--color-text-secondary) hover:bg-(--color-hover) hover:text-(--color-text-main)"
              }`}
            >
              {item.label}
              {item.label === "Messages" && unreadCount > 0 ? (
                <span className="ui-badge ml-2">{unreadCount > 99 ? "99+" : unreadCount}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <form
            className="ui-input-shell hidden h-9 w-64 items-center gap-2 px-3 xl:flex"
            onSubmit={handleSearchSubmit}
            role="search"
          >
            <Search className="h-4 w-4 shrink-0 text-(--color-text-muted)" />
            <input
              type="search"
              placeholder="Search SkillBridge"
              aria-label="Search dashboard"
              name="search"
              className="min-w-0 flex-1 bg-transparent text-sm text-(--color-text-main) outline-none placeholder:text-(--color-text-muted)"
            />
          </form>

          <button
            type="button"
            onClick={() => {
              startRouteLoading("/dashboard/messages");
              router.push("/dashboard/messages");
            }}
            className="ui-icon-button relative"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-(--color-surface) bg-(--color-brand) px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>

          <ProfileAvatar
            activeItem={activeItem}
            avatarUrl={avatarUrl}
            email={email}
            profileMenuOpen={profileMenuOpen}
            profileMenuRef={profileMenuRef}
            setProfileMenuOpen={setProfileMenuOpen}
            signOut={signOut}
          />

          {canPostJob ? (
            <button type="button" className="ui-primary-button hidden md:inline-flex" onClick={onPostJob}>
              Post a job
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
