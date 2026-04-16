"use client";

import type { ReactNode } from "react";
import AuthRouteGuard from "@/components/auth-route-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AuthRouteGuard mode="protected">{children}</AuthRouteGuard>;
}