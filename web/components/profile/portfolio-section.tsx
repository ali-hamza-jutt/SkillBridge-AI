"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  X, Pencil, Trash2, ExternalLink, FileText,
  ImageIcon, Video, Loader2, Upload, Check, ChevronRight,
} from "lucide-react";
import SectionCard, { FormField, Input, Textarea } from "./section-card";
import SkillSuggestionInput from "@/components/skill-suggestion-input";
import { useGcsControllerGenerateSignedUrlMutation, useSkillsControllerGetAllQuery } from "@/lib/api";
import {
  usePortfolioCreateMutation,
  usePortfolioUpdateMutation,
  usePortfolioDeleteMutation,
  type CreatePortfolioProjectDto,
} from "@/lib/api";
import type { PortfolioProject, ProjectMedia } from "@/lib/types/profile";
import { fileTypeMeta, formatFileSize } from "@/lib/utils/formatting";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import PortfolioProjectModal from "./portfolio-project-modal";

const MAX_IMAGES = 15;
const MAX_VIDEO = 1;
const MAX_TECH = 5;
const DESC_LIMIT = 700;

// ── Types ─────────────────────────────────────────────────────────────────────
type PendingMedia = {
  id: string;
  file: File;
  preview: string | null;
  uploading: boolean;
  error: boolean;
  result: ProjectMedia | null;
};

function mediaCover(project: PortfolioProject): ProjectMedia | null {
  return project.media.find((m) => m.type === "IMAGE") ?? project.media[0] ?? null;
}

// ── Project Card ──────────────────────────────────────────────────────────────
function ProjectCard({
  project, onClick, onEdit, onDelete,
}: {
  project: PortfolioProject;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cover = mediaCover(project);
  return (
    <div
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-(--color-surface) transition hover:shadow-md"
      onClick={onClick}
    >
      <div className="relative aspect-video w-full bg-[color-mix(in_srgb,var(--color-surface-strong)_60%,transparent)]">
        {cover?.type === "IMAGE" ? (
          <Image src={cover.url} alt={project.title} fill className="object-cover" unoptimized />
        ) : cover?.type === "VIDEO" ? (
          <video src={cover.url} className="h-full w-full object-cover" muted />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-(--color-text-muted) opacity-30" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow transition hover:bg-white"><Pencil className="h-4 w-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-red-500 shadow transition hover:bg-white"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-bold text-(--color-text-main)">{project.title}</h3>
          {project.projectUrl && (
            <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="shrink-0 text-(--color-text-muted) hover:text-(--color-brand-strong)">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <p className="text-xs text-(--color-text-muted)">{project.role}</p>
        <p className="line-clamp-2 text-xs leading-5 text-(--color-text-muted)">{project.description}</p>
        {project.techStack.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-1">
            {project.techStack.slice(0, 4).map((t) => (
              <span key={t} className="rounded-md bg-[color-mix(in_srgb,var(--color-brand-soft)_55%,var(--color-surface))] px-2 py-0.5 text-[10px] font-semibold text-(--color-brand-strong)">{t}</span>
            ))}
            {project.techStack.length > 4 && <span className="rounded-md px-2 py-0.5 text-[10px] text-(--color-text-muted)">+{project.techStack.length - 4}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Media thumbnail grid (shared between step1 & step2) ───────────────────────
function MediaGrid({
  media, pending,
  onRemoveMedia, onRemovePending,
  thumbnailUrl, onSelectThumbnail,
}: {
  media: ProjectMedia[];
  pending: PendingMedia[];
  onRemoveMedia: (idx: number) => void;
  onRemovePending: (id: string) => void;
  thumbnailUrl?: string | null;
  onSelectThumbnail?: (url: string) => void;
}) {
  const isSelectMode = !!onSelectThumbnail;
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {media.map((m, i) => (
        <div
          key={i}
          className={`group relative aspect-square overflow-hidden rounded-xl border-2 bg-[color-mix(in_srgb,var(--color-surface-strong)_50%,transparent)] transition
            ${isSelectMode && m.type === "IMAGE" ? "cursor-pointer" : ""}
            ${isSelectMode && m.url === thumbnailUrl ? "border-(--color-brand)" : "border-(--color-border)"}`}
          onClick={() => isSelectMode && m.type === "IMAGE" && onSelectThumbnail(m.url)}
        >
          {m.type === "IMAGE" ? (
            <Image src={m.url} alt={m.name} fill className="object-cover" unoptimized />
          ) : m.type === "VIDEO" ? (
            <video src={m.url} className="h-full w-full object-cover" muted />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1">
              <FileText className="h-6 w-6 text-(--color-text-muted)" />
              <span className="px-1 text-center text-[10px] text-(--color-text-muted) line-clamp-2">{m.name}</span>
            </div>
          )}
          {isSelectMode && m.url === thumbnailUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-(--color-brand)">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          )}
          {!isSelectMode && (
            <button type="button" onClick={() => onRemoveMedia(i)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"><X className="h-3 w-3" /></button>
          )}
        </div>
      ))}

      {pending.map((p) => (
        <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface-strong)_50%,transparent)]">
          {p.preview ? (
            p.file.type.startsWith("image/") ? (
              <Image src={p.preview} alt={p.file.name} fill className="object-cover" unoptimized />
            ) : (
              <video src={p.preview} className="h-full w-full object-cover" muted />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${fileTypeMeta(p.file.type).bg}`}>
                <FileText className="h-5 w-5 text-white/80" />
              </div>
            </div>
          )}
          <div className={`absolute inset-0 flex items-center justify-center ${p.uploading || p.error ? "bg-black/50" : "bg-transparent"}`}>
            {p.uploading && <Loader2 className="h-5 w-5 animate-spin text-white" />}
            {p.error && <span className="text-xs font-semibold text-red-300">Failed</span>}
            {!p.uploading && !p.error && <Upload className="h-4 w-4 text-green-400" />}
          </div>
          {!isSelectMode && (
            <button type="button" onClick={() => onRemovePending(p.id)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"><X className="h-3 w-3" /></button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Project Form (2-step slide-over) ──────────────────────────────────────────
function ProjectForm({
  initial, onSave, onClose,
}: {
  initial?: PortfolioProject;
  onSave: (dto: CreatePortfolioProjectDto) => Promise<void>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [techInput, setTechInput] = useState("");
  const [techStack, setTechStack] = useState<string[]>(initial?.techStack ?? []);
  const [projectUrl, setProjectUrl] = useState(initial?.projectUrl ?? "");
  const [media, setMedia] = useState<ProjectMedia[]>(initial?.media ?? []);
  const [pending, setPending] = useState<PendingMedia[]>([]);

  // Step 2
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    initial?.media.find((m) => m.type === "IMAGE")?.url ?? null,
  );
  const [saving, setSaving] = useState(false);

  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const [generateSignedUrl] = useGcsControllerGenerateSignedUrlMutation();
  const { data: allSkillsRaw = [] } = useSkillsControllerGetAllQuery();
  const skillSuggestions = allSkillsRaw as Array<{ name?: unknown }>;

  const imageCount = media.filter((m) => m.type === "IMAGE").length + pending.filter((p) => p.file.type.startsWith("image/")).length;
  const videoCount = media.filter((m) => m.type === "VIDEO").length + pending.filter((p) => p.file.type.startsWith("video/")).length;
  const isUploading = pending.some((p) => p.uploading);

  // All successfully uploaded/existing images for thumbnail selection
  const allImages = [
    ...media.filter((m) => m.type === "IMAGE"),
    ...pending.filter((p) => p.result?.type === "IMAGE").map((p) => p.result!),
  ];

  const uploadFile = async (p: PendingMedia) => {
    try {
      const { signedUrl, publicUrl, objectName } = (await generateSignedUrl({
        generateUploadUrlDto: { fileName: p.file.name, mimeType: p.file.type, folder: "portfolio-media" },
      }).unwrap()) as { signedUrl: string; publicUrl: string; objectName: string };

      await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": p.file.type }, body: p.file });

      const type: ProjectMedia["type"] = p.file.type.startsWith("image/") ? "IMAGE" : p.file.type.startsWith("video/") ? "VIDEO" : "DOCUMENT";
      const result: ProjectMedia = { url: publicUrl, publicId: objectName, name: p.file.name, mimeType: p.file.type, type, size: p.file.size };
      setPending((prev) => prev.map((x) => x.id === p.id ? { ...x, uploading: false, result } : x));
    } catch {
      setPending((prev) => prev.map((x) => x.id === p.id ? { ...x, uploading: false, error: true } : x));
    }
  };

  const addFiles = (files: File[]) => {
    for (const file of files) {
      const id = `${Date.now()}-${Math.random()}`;
      const preview = file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : null;
      const p: PendingMedia = { id, file, preview, uploading: true, error: false, result: null };
      setPending((prev) => [...prev, p]);
      uploadFile(p);
    }
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p?.preview) URL.revokeObjectURL(p.preview);
      return prev.filter((x) => x.id !== id);
    });
  };

  const removeMedia = (idx: number) => {
    const removed = media[idx];
    if (thumbnailUrl === removed.url) setThumbnailUrl(null);
    setMedia((prev) => prev.filter((_, i) => i !== idx));
  };

  // Go to step 2 — pick default thumbnail
  const goToPreview = () => {
    const firstImg = allImages[0];
    if (!thumbnailUrl && firstImg) setThumbnailUrl(firstImg.url);
    setStep(2);
  };

  const handleSubmit = async () => {
    const uploaded = pending.filter((p) => p.result).map((p) => p.result!);
    const allMedia = [...media, ...uploaded];

    // Put selected thumbnail first
    const sorted = thumbnailUrl
      ? [...allMedia.filter((m) => m.url === thumbnailUrl), ...allMedia.filter((m) => m.url !== thumbnailUrl)]
      : allMedia;

    setSaving(true);
    try {
      await onSave({
        title: title.trim(), description: description.trim(), role: role.trim(),
        techStack, projectUrl: projectUrl.trim() || undefined, media: sorted,
      });
      onClose();
    } catch {
      // error already toasted by caller
    } finally {
      setSaving(false);
    }
  };

  const canProceed = title.trim() && description.trim() && role.trim() && !isUploading && allImages.length > 0;

  const slideoverHeader = (
    <div className="flex items-center justify-between border-b border-(--color-border) px-6 py-4">
      <div className="flex items-center gap-3">
        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)]"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
        )}
        <div>
          <h2 className="text-base font-bold text-(--color-text-main)">
            {initial ? "Edit Project" : step === 1 ? "Add Portfolio Project" : "Preview & Thumbnail"}
          </h2>
          {!initial && (
            <p className="text-xs text-(--color-text-muted)">Step {step} of 2</p>
          )}
        </div>
      </div>
      <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)]">
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  // ── Step 1 ──
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-(--color-surface) shadow-2xl sm:rounded-l-3xl">
          {slideoverHeader}

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-5">
              <FormField label="Project Title" required>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. E-commerce Platform" maxLength={120} />
              </FormField>

              <FormField label="Your Role" required>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Lead Frontend Developer" maxLength={80} />
              </FormField>

              <FormField label="Description" required>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, DESC_LIMIT))} rows={4} placeholder="Describe the project, your contributions and impact…" />
                <p className={`mt-1 text-right text-xs ${description.length >= DESC_LIMIT ? "text-red-500" : "text-(--color-text-muted)"}`}>
                  {description.length}/{DESC_LIMIT}
                </p>
              </FormField>

              {/* Tech Stack — reuse SkillSuggestionInput */}
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-(--color-text-muted)">
                  Tech Stack <span className="normal-case font-normal">({techStack.length}/{MAX_TECH})</span>
                </span>
                <SkillSuggestionInput
                  label=""
                  inputId="portfolio-tech-stack"
                  value={techInput}
                  onValueChange={setTechInput}
                  selectedSkills={techStack}
                  suggestions={skillSuggestions}
                  onAddSkill={(s) => {
                    if (techStack.length < MAX_TECH && !techStack.includes(s)) {
                      setTechStack((p) => [...p, s]);
                    }
                    setTechInput("");
                  }}
                  onRemoveSkill={(s) => setTechStack((p) => p.filter((x) => x !== s))}
                  placeholder={techStack.length >= MAX_TECH ? `Max ${MAX_TECH} skills reached` : "Type to search skills…"}
                  disabled={techStack.length >= MAX_TECH}
                  suggestionLimit={20}
                  noMatchesText="No matching skills. Try a different term."
                />
              </div>

              <FormField label="Project URL">
                <Input value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} placeholder="https://…" type="url" />
              </FormField>

              {/* Media */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--color-text-muted)">
                  Media <span className="font-normal normal-case text-red-500">* 1 image required</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={imageCount >= MAX_IMAGES} onClick={() => imageRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-dashed border-(--color-border) px-3 py-2 text-xs font-semibold text-(--color-text-muted) transition hover:border-(--color-brand) hover:text-(--color-brand-strong) disabled:opacity-40">
                    <ImageIcon className="h-4 w-4" /> Images ({imageCount}/{MAX_IMAGES})
                  </button>
                  <button type="button" disabled={videoCount >= MAX_VIDEO} onClick={() => videoRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-dashed border-(--color-border) px-3 py-2 text-xs font-semibold text-(--color-text-muted) transition hover:border-(--color-brand) hover:text-(--color-brand-strong) disabled:opacity-40">
                    <Video className="h-4 w-4" /> Video ({videoCount}/{MAX_VIDEO})
                  </button>
                  <button type="button" onClick={() => docRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-dashed border-(--color-border) px-3 py-2 text-xs font-semibold text-(--color-text-muted) transition hover:border-(--color-brand) hover:text-(--color-brand-strong)">
                    <FileText className="h-4 w-4" /> Docs
                  </button>
                </div>
                <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(Array.from(e.target.files ?? []).slice(0, MAX_IMAGES - imageCount)); e.target.value = ""; }} />
                <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => { addFiles(Array.from(e.target.files ?? []).slice(0, 1)); e.target.value = ""; }} />
                <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.txt,.xlsx,.pptx,.zip" multiple className="hidden" onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />

                {(media.length > 0 || pending.length > 0) && (
                  <MediaGrid
                    media={media} pending={pending}
                    onRemoveMedia={removeMedia} onRemovePending={removePending}
                  />
                )}

                {media.filter((m) => m.type === "DOCUMENT").length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {media.filter((m) => m.type === "DOCUMENT").map((m, i) => (
                      <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-(--color-brand-strong) hover:underline">
                        <FileText className="h-3 w-3" />{m.name} {m.size ? `(${formatFileSize(m.size)})` : ""}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-(--color-border) px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-(--color-border) px-5 py-2.5 text-sm font-semibold text-(--color-text-muted) transition hover:bg-[color-mix(in_srgb,var(--color-border)_30%,transparent)]">
              Cancel
            </button>
            {initial ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !title.trim() || !description.trim() || !role.trim() || isUploading}
                className="flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            ) : (
              <button
                type="button"
                onClick={goToPreview}
                disabled={!canProceed}
                className="flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Preview
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Preview + Thumbnail ──
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-(--color-surface) shadow-2xl sm:rounded-l-3xl">
        {slideoverHeader}

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-5">
            {/* Summary */}
            <div className="rounded-xl border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface-strong)_30%,transparent)] p-4">
              <h3 className="text-sm font-bold text-(--color-text-main)">{title}</h3>
              <p className="mt-0.5 text-xs text-(--color-text-muted)">{role}</p>
              {projectUrl && (
                <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-(--color-brand-strong) hover:underline">
                  <ExternalLink className="h-3 w-3" /> {projectUrl}
                </a>
              )}
              <p className="mt-2 text-xs leading-5 text-(--color-text-muted) line-clamp-3">{description}</p>
              {techStack.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {techStack.map((t) => (
                    <span key={t} className="rounded-md bg-[color-mix(in_srgb,var(--color-brand-soft)_55%,var(--color-surface))] px-2 py-0.5 text-[10px] font-semibold text-(--color-brand-strong)">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Thumbnail selection */}
            {allImages.length > 1 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-(--color-text-muted)">
                  Select Thumbnail <span className="font-normal normal-case">(tap an image)</span>
                </p>
                <MediaGrid
                  media={media.filter((m) => m.type === "IMAGE")}
                  pending={pending.filter((p) => p.result?.type === "IMAGE")}
                  onRemoveMedia={() => {}}
                  onRemovePending={() => {}}
                  thumbnailUrl={thumbnailUrl}
                  onSelectThumbnail={setThumbnailUrl}
                />
              </div>
            )}

            {allImages.length === 1 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-(--color-text-muted)">Thumbnail</p>
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-(--color-border)">
                  <Image src={allImages[0].url} alt="thumbnail" fill className="object-cover" unoptimized />
                </div>
              </div>
            )}

            {/* Non-image media preview */}
            {(media.filter((m) => m.type !== "IMAGE").length > 0 || pending.filter((p) => p.result && p.result.type !== "IMAGE").length > 0) && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-(--color-text-muted)">Other Media</p>
                <MediaGrid
                  media={media.filter((m) => m.type !== "IMAGE")}
                  pending={pending.filter((p) => p.result && p.result.type !== "IMAGE")}
                  onRemoveMedia={() => {}}
                  onRemovePending={() => {}}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-(--color-border) px-6 py-4">
          <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-(--color-border) px-5 py-2.5 text-sm font-semibold text-(--color-text-muted) transition hover:bg-[color-mix(in_srgb,var(--color-border)_30%,transparent)]">
            Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Project
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Portfolio Section ─────────────────────────────────────────────────────────
type Props = { projects: PortfolioProject[]; onRefresh: () => void };

export default function PortfolioSection({ projects, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PortfolioProject | null>(null);
  const [viewing, setViewing] = useState<PortfolioProject | null>(null);

  const [createProject] = usePortfolioCreateMutation();
  const [updateProject] = usePortfolioUpdateMutation();
  const [deleteProject] = usePortfolioDeleteMutation();

  const handleCreate = async (dto: CreatePortfolioProjectDto) => {
    try {
      await createProject(dto).unwrap();
      onRefresh();
      toast.success("Project added");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to add project"));
      throw err;
    }
  };

  const handleUpdate = async (dto: CreatePortfolioProjectDto) => {
    if (!editing) return;
    try {
      await updateProject({ id: editing._id, body: dto }).unwrap();
      onRefresh();
      toast.success("Project updated");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update project"));
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    try {
      await deleteProject(id).unwrap();
      onRefresh();
      toast.success("Project deleted");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete project"));
    }
  };

  return (
    <>
      <SectionCard title="Portfolio" onAdd={() => setShowForm(true)} addLabel="Add Project">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-brand-soft)_50%,var(--color-surface))]">
              <ImageIcon className="h-6 w-6 text-(--color-brand-strong)" />
            </div>
            <p className="text-sm text-(--color-text-muted)">No projects yet. Showcase your best work!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard key={p._id} project={p} onClick={() => setViewing(p)} onEdit={() => { setEditing(p); setShowForm(true); }} onDelete={() => handleDelete(p._id)} />
            ))}
          </div>
        )}
      </SectionCard>

      {showForm && (
        <ProjectForm
          initial={editing ?? undefined}
          onSave={editing ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {viewing && (
        <PortfolioProjectModal project={viewing} onClose={() => setViewing(null)} />
      )}
    </>
  );
}
