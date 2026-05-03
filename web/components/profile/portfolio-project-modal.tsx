"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { X, Link2, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import type { PortfolioProject, ProjectMedia } from "@/lib/types/profile";

function MediaSlide({ item }: { item: ProjectMedia }) {
  if (item.type === "IMAGE") {
    return (
      <div className="relative h-full w-full">
        <Image src={item.url} alt={item.name} fill className="object-contain" unoptimized />
      </div>
    );
  }
  if (item.type === "VIDEO") {
    return <video src={item.url} controls className="h-full w-full object-contain" />;
  }
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full w-full flex-col items-center justify-center gap-3 text-(--color-text-muted) hover:text-(--color-brand-strong)"
    >
      <FileText className="h-12 w-12" />
      <span className="text-sm font-semibold underline">{item.name}</span>
    </a>
  );
}

type Props = {
  project: PortfolioProject;
  onClose: () => void;
};

export default function PortfolioProjectModal({ project, onClose }: Props) {
  const [slide, setSlide] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  const media = project.media;
  const hasMedia = media.length > 0;

  const prev = () => setSlide((s) => (s - 1 + media.length) % media.length);
  const next = () => setSlide((s) => (s + 1) % media.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasMedia) prev();
      if (e.key === "ArrowRight" && hasMedia) next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hasMedia, onClose]);

  const copyLink = () => {
    if (project.projectUrl) {
      navigator.clipboard.writeText(project.projectUrl);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: "90vh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-8 py-5">
          <h2 className="flex-1 text-2xl font-bold text-gray-900 leading-tight pr-4">{project.title}</h2>
          <div className="flex shrink-0 items-center gap-2">
            {project.projectUrl && (
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-emerald-600 transition hover:bg-gray-50"
              >
                <Link2 className="h-3.5 w-3.5" />
                Copy link
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex min-h-0 flex-1 overflow-y-auto">
          <div className={`flex w-full ${hasMedia ? "flex-col md:flex-row" : "flex-col"}`}>

            {/* Left — role + description */}
            <div className={`flex flex-col gap-5 px-8 py-6 ${hasMedia ? "md:w-2/5 md:border-r md:border-gray-100" : "w-full"}`}>
              <div>
                <p className="text-sm text-gray-500">
                  My role. <span className="font-semibold text-gray-900">{project.role}</span>
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-500">Project description.</p>
                <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{project.description}</p>
              </div>

              {project.projectUrl && (
                <a
                  href={project.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:underline"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  View project
                </a>
              )}
            </div>

            {/* Right — media carousel */}
            {hasMedia && (
              <div className="flex flex-col md:w-3/5">
                {/* Main slide */}
                <div className="relative flex-1 bg-gray-50" style={{ minHeight: 320 }}>
                  <MediaSlide item={media[slide]} />

                  {media.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prev}
                        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition hover:bg-white"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={next}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow transition hover:bg-white"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Dots */}
                {media.length > 1 && (
                  <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-100">
                    {media.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSlide(i)}
                        className={`h-2.5 w-2.5 rounded-full transition-all ${
                          i === slide ? "bg-emerald-500 scale-110" : "bg-gray-300 hover:bg-gray-400"
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Thumbnail strip */}
                {media.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto px-4 pb-4 pt-1">
                    {media.map((m, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSlide(i)}
                        className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                          i === slide ? "border-emerald-500" : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        {m.type === "IMAGE" ? (
                          <Image src={m.url} alt={m.name} fill className="object-cover" unoptimized />
                        ) : m.type === "VIDEO" ? (
                          <video src={m.url} className="h-full w-full object-cover" muted />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gray-100">
                            <FileText className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer — skills ── */}
        {project.techStack.length > 0 && (
          <div className="border-t border-gray-100 px-8 py-5">
            <p className="mb-3 text-sm font-semibold text-gray-500">Skills and deliverables</p>
            <div className="flex flex-wrap gap-2">
              {project.techStack.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
