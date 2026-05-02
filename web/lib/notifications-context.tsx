"use client";

import { useEffect, type PropsWithChildren } from "react";
import { useAppSelector } from "@/lib/hooks";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from([...window.atob(b64)].map((c) => c.charCodeAt(0)));
}

function PushSetup() {
  const { token } = useAppSelector((s) => s.auth);

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
  return (
    <>
      <PushSetup />
      {children}
    </>
  );
}
