"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  src: string;
  type?: "IMAGE" | "VIDEO";
  title?: string;
  onClose: () => void;
};

export default function MediaModal({ open, src, type = "IMAGE", title, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="relative max-h-full w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-20 inline-flex items-center justify-center rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex h-full w-full items-center justify-center">
          {type === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={title ?? "Preview"} src={src} className="max-h-[90vh] max-w-full object-contain rounded-md" />
          ) : (
            <video src={src} controls autoPlay className="max-h-[90vh] max-w-full rounded-md object-contain" />
          )}
        </div>
      </div>
    </div>
  );
}
