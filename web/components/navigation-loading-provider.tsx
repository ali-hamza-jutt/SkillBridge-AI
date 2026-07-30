"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { LoadingSpinner } from "@/components/app-loader";

type NavigationLoadingContextValue = {
  startRouteLoading: (destination?: string) => void;
};

const NavigationLoadingContext = createContext<NavigationLoadingContextValue | null>(null);
const NAVIGATION_TIMEOUT_MS = 12_000;

export function useNavigationLoading() {
  const context = useContext(NavigationLoadingContext);
  if (!context) throw new Error("useNavigationLoading must be used inside NavigationLoadingProvider");
  return context;
}

export default function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const currentLocation = pathname;

  const startRouteLoading = useCallback((destination?: string) => {
    if (destination && typeof window !== "undefined") {
      const nextUrl = new URL(destination, window.location.href);
      const nextLocation = `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`;
      const activeUrl = new URL(window.location.href);
      const activeLocation = `${activeUrl.pathname}?${activeUrl.searchParams.toString()}`;
      if (nextLocation === activeLocation) return;
      if (nextUrl.pathname === activeUrl.pathname) {
        setLoading(true);
        window.setTimeout(() => setLoading(false), 400);
        return;
      }
    }
    setLoading(true);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setLoading(false));
    return () => window.cancelAnimationFrame(frame);
  }, [currentLocation]);

  useEffect(() => {
    if (!loading) return;
    const timeout = window.setTimeout(() => setLoading(false), NAVIGATION_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.download || anchor.target === "_blank") return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      startRouteLoading(`${destination.pathname}${destination.search}`);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [startRouteLoading]);

  const contextValue = useMemo(() => ({ startRouteLoading }), [startRouteLoading]);

  return (
    <NavigationLoadingContext.Provider value={contextValue}>
      {children}
      {loading ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[color-mix(in_srgb,var(--color-surface)_82%,transparent)] backdrop-blur-[2px]"
          role="status"
          aria-live="assertive"
          aria-label="Loading page"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-surface) shadow-(--shadow-panel)">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      ) : null}
    </NavigationLoadingContext.Provider>
  );
}
