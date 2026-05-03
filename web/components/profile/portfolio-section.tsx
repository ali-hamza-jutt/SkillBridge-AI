"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import {
  Plus, X, Pencil, Trash2, ExternalLink, FileText,
  ImageIcon, Video, Loader2, Upload,
} from "lucide-react";
import SectionCard, { FormField, Input, Textarea } from "./section-card";
import { useGcsControllerGenerateSignedUrlMutation } from "@/lib/api";
import {
  usePortfolioCreateMutation,
  usePortfolioUpdateMutation,
  usePortfolioDeleteMutation,
  type CreatePortfolioProjectDto,
} from "@/lib/api";
import type { PortfolioProject, ProjectMedia } from "@/lib/types/profile";
import { fileTypeMeta, formatFileSize } from "@/lib/utils/formatting";

const MAX_IMAGES = 15;
const MAX_VIDEO = 1;

// ── Media upload helpers ──────────────────────────────────────────────────────
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
  project,
  onEdit,
  onDelete,
}: {
  project: PortfolioProject;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cover = mediaCover(project);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-(--color-surface) transition hover:shadow-md">
      {/* Cover */}
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
        {/* Actions overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100">
          <button onClick={onEdit} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow transition hover:bg-white"><Pencil className="h-4 w-4" /></button>
          <button onClick={onDelete} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-red-500 shadow transition hover:bg-white"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-bold text-(--color-text-main)">{project.title}</h3>
          {project.projectUrl && (
            <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-(--color-text-muted) hover:text-(--color-brand-strong)">
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

// ── Project Form Modal ────────────────────────────────────────────────────────
function ProjectForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: PortfolioProject;
  onSave: (dto: CreatePortfolioProjectDto) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [techInput, setTechInput] = useState("");
  const [techStack, setTechStack] = useState<string[]>(initial?.techStack ?? []);
  const [projectUrl, setProjectUrl] = useState(initial?.projectUrl ?? "");
  const [media, setMedia] = useState<ProjectMedia[]>(initial?.media ?? []);
  const [pending, setPending] = useState<PendingMedia[]>([]);
  const [saving, setSaving] = useState(false);

  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const [generateSignedUrl] = useGcsControllerGenerateSignedUrlMutation();

  const imageCount = media.filter((m) => m.type === "IMAGE").length + pending.filter((p) => p.file.type.startsWith("image/")).length;
  const videoCount = media.filter((m) => m.type === "VIDEO").length + pending.filter((p) => p.file.type.startsWith("video/")).length;

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
    setPending((prev) => { const p = prev.find((x) => x.id === id); if (p?.preview) URL.revokeObjectURL(p.preview); return prev.filter((x) => x.id !== id); });
  };

  const removeMedia = (idx: number) => setMedia((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !role.trim()) return;
    const uploaded = pending.filter((p) => p.result).map((p) => p.result!);
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim(), role: role.trim(), techStack, projectUrl: projectUrl.trim() || undefined, media: [...media, ...uploaded] });
      onClose();
    } finally { setSaving(false); }
  };

  const addTech = () => {
    const t = techInput.trim();
    if (t && !techStack.includes(t)) setTechStack((p) => [...p, t]);
    setTechInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-(--color-surface) shadow-2xl sm:rounded-l-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--color-border) px-6 py-4">
          <h2 className="text-base font-bold text-(--color-text-main)">{initial ? "Edit Project" : "Add Portfolio Project"}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)]"><X className="h-4 w-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-5">
            <FormField label="Project Title" required>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. E-commerce Platform" maxLength={120} />
            </FormField>

            <FormField label="Your Role" required>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Lead Frontend Developer" maxLength={80} />
            </FormField>

            <FormField label="Description" required>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the project, your contributions and impact…" maxLength={1000} />
            </FormField>

            {/* Tech Stack */}
            <FormField label="Tech Stack">
              <div className="flex gap-2">
                <Input value={techInput} onChange={(e) => setTechInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTech(); } }} placeholder="e.g. React, Node.js…" />
                <button type="button" onClick={addTech} className="shrink-0 rounded-xl border border-(--color-border) px-3 text-sm font-semibold text-(--color-text-muted) hover:border-(--color-brand) hover:text-(--color-brand-strong)"><Plus className="h-4 w-4" /></button>
              </div>
              {techStack.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {techStack.map((t) => (
                    <span key={t} className="flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-brand-soft)_60%,var(--color-surface))] px-2.5 py-1 text-xs font-semibold text-(--color-brand-strong)">
                      {t}
                      <button type="button" onClick={() => setTechStack((p) => p.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </FormField>

            <FormField label="Project URL">
              <Input value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} placeholder="https://…" type="url" />
            </FormField>

            {/* Media uploads */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-(--color-text-muted)">Media</p>
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
              <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; addFiles(f.slice(0, MAX_IMAGES - imageCount)); }} />
              <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; addFiles(f.slice(0, 1)); }} />
              <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.txt,.xlsx,.pptx,.zip" multiple className="hidden" onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />

              {/* Existing media */}
              {media.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {media.map((m, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface-strong)_50%,transparent)]">
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
                      <button type="button" onClick={() => removeMedia(i)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending uploads */}
              {pending.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
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
                      <button type="button" onClick={() => removePending(p.id)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Size hints */}
              {media.length > 0 && (
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

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-(--color-border) px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-(--color-border) px-5 py-2.5 text-sm font-semibold text-(--color-text-muted) transition hover:bg-[color-mix(in_srgb,var(--color-border)_30%,transparent)]">Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !title.trim() || !description.trim() || !role.trim() || pending.some((p) => p.uploading)}
            className="flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? "Save Changes" : "Add Project"}
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

  const [createProject] = usePortfolioCreateMutation();
  const [updateProject] = usePortfolioUpdateMutation();
  const [deleteProject] = usePortfolioDeleteMutation();

  const handleCreate = async (dto: CreatePortfolioProjectDto) => {
    await createProject(dto).unwrap();
    onRefresh();
  };

  const handleUpdate = async (dto: CreatePortfolioProjectDto) => {
    if (!editing) return;
    await updateProject({ id: editing._id, body: dto }).unwrap();
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await deleteProject(id).unwrap();
    onRefresh();
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
              <ProjectCard key={p._id} project={p} onEdit={() => { setEditing(p); setShowForm(true); }} onDelete={() => handleDelete(p._id)} />
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
    </>
  );
}
