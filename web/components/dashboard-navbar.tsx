"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellDot, MessageSquare, X } from "lucide-react";
import { logout } from "@/lib/features/auth/authSlice";
import { useAppDispatch } from "@/lib/hooks";
import { useUnreadConversationCount } from "@/lib/useUnreadMessages";
import { useNotifications, type AppNotification } from "@/lib/notifications-context";

type DashboardNavbarProps = {
  role: "FREELANCER" | "HIRER" | "ADMIN" | null;
  activeItem?: "jobs" | "messages" | "profile";
  onPostJob?: () => void;
};

const isActiveClass =
  "border-[color-mix(in_srgb,var(--color-brand)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_66%,var(--color-surface))] text-(--color-brand-strong)";
const defaultClass =
  "border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] text-(--color-text-main)";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotificationItem({
  notification,
  onRead,
  router,
  onClose,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
  router: ReturnType<typeof useRouter>;
  onClose: () => void;
}) {
  const handleClick = () => {
    if (!notification.isRead) onRead(notification._id);
    if (notification.url) {
      router.push(notification.url);
      onClose();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full px-4 py-3 text-left transition hover:bg-[color-mix(in_srgb,var(--color-brand-soft)_50%,var(--color-surface))] ${
        notification.isRead ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {!notification.isRead && (
            <span className="mb-0.5 inline-block h-1.5 w-1.5 rounded-full bg-(--color-brand)" />
          )}
          <p className="truncate text-sm font-semibold text-(--color-text-main)">
            {notification.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-(--color-text-muted)">
            {notification.message}
          </p>
        </div>
        <span className="shrink-0 text-[10px] text-(--color-text-muted)">
          {timeAgo(notification.createdAt)}
        </span>
      </div>
    </button>
  );
}

export default function DashboardNavbar({ role, activeItem, onPostJob }: DashboardNavbarProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const unreadCount = useUnreadConversationCount();
  const { notifications, unreadCount: notifCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

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
          {/* Messages */}
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

          {/* Notification bell */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => setOpen((v) => !v)}
              className={`relative flex items-center justify-center rounded-full border p-2 transition ${
                open ? isActiveClass : defaultClass
              }`}
            >
              {notifCount > 0 ? (
                <BellDot className="h-4 w-4 shrink-0" />
              ) : (
                <Bell className="h-4 w-4 shrink-0" />
              )}
              {notifCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-(--color-brand) px-1 text-[10px] font-bold leading-none text-white">
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              ) : null}
            </button>

            {open ? (
              <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-(--color-surface) shadow-[0_12px_32px_-8px_rgba(15,23,42,0.22)]">
                <div className="flex items-center justify-between border-b border-(--color-border) px-4 py-3">
                  <span className="text-sm font-bold text-(--color-text-main)">Notifications</span>
                  <div className="flex items-center gap-2">
                    {notifCount > 0 ? (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-xs font-semibold text-(--color-brand-strong) hover:underline"
                      >
                        Mark all read
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="text-(--color-text-muted) hover:text-(--color-text-main)"
                      aria-label="Close"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="max-h-80 divide-y divide-[color-mix(in_srgb,var(--color-border)_60%,transparent)] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-(--color-text-muted)">
                      No notifications yet
                    </p>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <NotificationItem
                        key={n._id}
                        notification={n}
                        onRead={markRead}
                        router={router}
                        onClose={() => setOpen(false)}
                      />
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

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
