"use client";

import Image from "next/image";
import { getInitials } from "@/lib/utils/formatting";

export default function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return (
      <div className="shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-surface-tint)" style={{ width: size, height: size }}>
        <Image src={url} alt={name} width={size} height={size} className="h-full w-full object-cover" unoptimized />
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 select-none items-center justify-center rounded-[var(--radius-md)] bg-(--color-brand) font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {getInitials(name)}
    </div>
  );
}
