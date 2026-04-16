"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";

type AuthRouteGuardProps = {
  mode: "protected" | "public";
  children: ReactNode;
  redirectTo?: string;
};

export default function AuthRouteGuard({ mode, children, redirectTo = "/dashboard" }: AuthRouteGuardProps) {
  const router = useRouter();
  const { token, hydrated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (mode === "protected" && !token) {
      router.replace("/login");
      return;
    }

    if (mode === "public" && token) {
      router.replace(redirectTo);
    }
  }, [hydrated, mode, redirectTo, router, token]);

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)]">
        <div className="mx-auto flex min-h-screen w-[min(100%-2rem,980px)] items-center justify-center">
          <p className="text-sm text-[var(--color-text-muted)]">Loading session...</p>
        </div>
      </main>
    );
  }

  if (mode === "protected" && !token) {
    return null;
  }

  if (mode === "public" && token) {
    return null;
  }

  return <>{children}</>;
}