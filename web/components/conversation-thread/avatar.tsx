"use client";

import Image from "next/image";
import { getInitials } from "@/lib/utils/formatting";

export default function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return (
      <div className="shrink-0 overflow-hidden rounded-full" style={{ width: size, height: size }}>
        <Image src={url} alt={name} width={size} height={size} className="h-full w-full object-cover" unoptimized />
      </div>
    );
  }

  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-border)_60%,transparent)] text-(--color-text-muted) font-bold select-none"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(name)}
    </div>
  );
}
