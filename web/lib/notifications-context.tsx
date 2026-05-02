"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { usePathname } from "next/navigation";
import { useChatSocket } from "@/components/chat-socket-provider";
import { useAppSelector } from "@/lib/hooks";

export type AppNotification = {
  _id: string;
  type: "BID_RECEIVED" | "MESSAGE_NEW" | "HIRED";
  title: string;
  message: string;
  url?: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...window.atob(b64)].map((c) => c.charCodeAt(0)));
}

function NotificationsBootstrap({ onAdd }: { onAdd: (n: AppNotification) => void }) {
  const { socket } = useChatSocket();
  const { token } = useAppSelector((s) => s.auth);
  const pathname = usePathname();

  // real-time socket listener
  useEffect(() => {
    if (!socket) return;
    const handler = (notification: AppNotification) => {
      onAdd(notification);
      const onTargetPage =
        notification.url && pathname.startsWith(notification.url);
      if (!onTargetPage && typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/logo-light-removebg.png",
        });
      }
    };
    socket.on("notification", handler);
    return () => { socket.off("notification", handler); };
  }, [socket, pathname, onAdd]);

  // service worker + web push subscription
  useEffect(() => {
    if (!token || !VAPID_PUBLIC_KEY || typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const setup = async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      const { endpoint, keys } = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await fetch(`${API_URL}/notifications/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint, keys }),
      });
    };

    setup().catch((err) => console.error("[push setup]", err));
  }, [token]);

  return null;
}

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { token } = useAppSelector((s) => s.auth);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback((n: AppNotification) => {
    setNotifications((prev) => [n, ...prev]);
  }, []);

  // fetch persisted notifications on login
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: AppNotification[]) => setNotifications(data))
      .catch(() => null);
  }, [token]);

  const markRead = useCallback(
    (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
    },
    [token],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    fetch(`${API_URL}/notifications/read-all`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
  }, [token]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, markRead, markAllRead }),
    [notifications, unreadCount, markRead, markAllRead],
  );

  return (
    <NotificationsContext.Provider value={value}>
      <NotificationsBootstrap onAdd={addNotification} />
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}
