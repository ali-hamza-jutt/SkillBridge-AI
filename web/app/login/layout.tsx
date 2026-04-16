"use client";

import type { ReactNode } from "react";
import AuthRouteGuard from "@/components/auth-route-guard";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <AuthRouteGuard mode="public">{children}</AuthRouteGuard>;
}