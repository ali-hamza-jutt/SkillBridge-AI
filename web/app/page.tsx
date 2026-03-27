"use client";

import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
const DEMO_USER_ID = "DEMO_USER_1";

type NotificationItem = {
  userId?: string;
  message?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export default function Home() {
  const [status, setStatus] = useState("Disconnected");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const socket: Socket = useMemo(
    () =>
      io(SOCKET_URL, {
        autoConnect: false,
        transports: ["websocket"],
      }),
    [],
  );

  useEffect(() => {
    const onConnect = () => {
      setStatus("Connected");
      setError(null);
      socket.emit("register", DEMO_USER_ID);
    };

    const onDisconnect = () => setStatus("Disconnected");

    const onConnectError = (err: Error) => {
      setStatus("Disconnected");
      setError(err.message);
    };

    const onNotification = (payload: NotificationItem) => {
      setItems((prev) => [payload, ...prev]);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("notification", onNotification);
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("notification", onNotification);
      socket.disconnect();
    };
  }, [socket]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-cyan-100 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-white/70 bg-white/85 p-6 shadow-2xl backdrop-blur md:p-8">
        <h1 className="text-2xl font-bold tracking-tight">Realtime Notifications</h1>
        <p className="mt-2 text-sm text-slate-600">
          Auto-connected to your NestJS socket gateway for demo user <strong>{DEMO_USER_ID}</strong>.
        </p>

        <div className="mt-4 text-sm">
          Status:{" "}
          <span className={status === "Connected" ? "font-semibold text-emerald-700" : "font-semibold text-rose-600"}>
            {status}
          </span>
        </div>

        {error ? (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            Socket error: {error}
          </p>
        ) : null}

        <section className="mt-6">
          <h2 className="text-base font-semibold">Received Notifications</h2>
          <div className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1">
            {items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-sm text-slate-500">
                No notifications yet. Trigger an event from backend (for example task.assigned).
              </p>
            ) : (
              items.map((item, index) => (
                <article key={index} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-slate-800">
                    {item.message ?? "New notification"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">User: {item.userId ?? "unknown"}</p>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                    {JSON.stringify(item, null, 2)}
                  </pre>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
