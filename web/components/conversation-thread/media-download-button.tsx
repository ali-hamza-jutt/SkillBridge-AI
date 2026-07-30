"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadFile } from "@/lib/utils/downloadFile";

type Props = {
  url: string;
  fileName: string;
  variant?: "hover" | "modal";
};

export default function MediaDownloadButton({
  url,
  fileName,
  variant = "hover",
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const modal = variant === "modal";

  return (
    <button
      type="button"
      onClick={async (event) => {
        event.stopPropagation();
        if (downloading) return;
        setDownloading(true);
        try {
          await downloadFile(url, fileName);
        } finally {
          setDownloading(false);
        }
      }}
      disabled={downloading}
      className={
        modal
          ? "inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] bg-black/55 px-3 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-black/75 disabled:opacity-70"
          : "absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-black/60 text-white opacity-0 shadow-sm backdrop-blur-sm transition hover:bg-black/80 focus:opacity-100 disabled:opacity-70 group-hover:opacity-100"
      }
      aria-label={`Download ${fileName}`}
      title="Download"
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {modal ? (
        <span className="hidden sm:inline">
          {downloading ? "Downloading..." : "Download"}
        </span>
      ) : null}
    </button>
  );
}
