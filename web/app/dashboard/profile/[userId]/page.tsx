"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Building2, GraduationCap, Star, ExternalLink, FileText, ImageIcon, Loader2 } from "lucide-react";
import { useAppSelector } from "@/lib/hooks";
import { useUsersControllerFindOneQuery, usePortfolioGetByUserQuery, useCategoryControllerGetAllCategoriesQuery } from "@/lib/api";
import DashboardNavbar from "@/components/dashboard-navbar";
import PortfolioProjectModal from "@/components/profile/portfolio-project-modal";
import type { UserProfile, ExperienceEntry, EducationEntry, PortfolioProject } from "@/lib/types/profile";

const AVATAR_COLORS = ["#4f8ef7","#7c6ef7","#36b37e","#f97316","#e11d48","#0891b2","#8b5cf6","#059669"];
function avatarBg(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function monthLabel(ym: string) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-(--color-surface) p-6">
      <h2 className="mb-4 text-base font-bold text-(--color-text-main)">{title}</h2>
      {children}
    </div>
  );
}

function SkillChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--color-brand)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_68%,var(--color-surface))] px-2.5 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--color-brand-strong)_88%,var(--color-text-main))]">
      {label}
    </span>
  );
}

function ProjectCard({ project }: { project: PortfolioProject }) {
  const cover = project.media.find((m) => m.type === "IMAGE") ?? project.media[0] ?? null;
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-(--color-surface)">
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
      </div>
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
        {project.media.some((m) => m.type === "DOCUMENT") && (
          <div className="mt-1 flex flex-wrap gap-2">
            {project.media.filter((m) => m.type === "DOCUMENT").map((m, i) => (
              <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-(--color-brand-strong) hover:underline">
                <FileText className="h-3 w-3" />{m.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExperienceItem({ entry }: { entry: ExperienceEntry }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-brand-soft)_60%,var(--color-surface))]">
        <Building2 className="h-4 w-4 text-(--color-brand-strong)" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-(--color-text-main)">{entry.jobTitle}</p>
        <p className="text-sm text-(--color-text-muted)">{entry.company}</p>
        <p className="mt-0.5 text-xs text-(--color-text-muted)">
          {monthLabel(entry.startDate)} – {entry.current ? "Present" : monthLabel(entry.endDate ?? "")}
        </p>
        {entry.description && <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-(--color-text-muted)">{entry.description}</p>}
      </div>
    </div>
  );
}

function EducationItem({ entry }: { entry: EducationEntry }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-accent-soft)_60%,var(--color-surface))]">
        <GraduationCap className="h-4 w-4 text-(--color-brand-strong)" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-(--color-text-main)">{entry.degree} · {entry.field}</p>
        <p className="text-sm text-(--color-text-muted)">{entry.institution}</p>
        <p className="mt-0.5 text-xs text-(--color-text-muted)">
          {monthLabel(entry.startDate)} – {entry.current ? "Present" : monthLabel(entry.endDate ?? "")}
        </p>
      </div>
    </div>
  );
}

type Category = { _id: string; name: string };

export default function FreelancerProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { token, role } = useAppSelector((s) => s.auth);
  const [viewing, setViewing] = useState<PortfolioProject | null>(null);

  const { data: profileRaw, isLoading: profileLoading } = useUsersControllerFindOneQuery({ id: userId }, { skip: !token || !userId });
  const { data: portfolioRaw = [], isLoading: portfolioLoading } = usePortfolioGetByUserQuery(userId, { skip: !token || !userId });
  const { data: categoriesRaw = [] } = useCategoryControllerGetAllCategoriesQuery();

  const profile = profileRaw as UserProfile | undefined;
  const portfolio = portfolioRaw as PortfolioProject[];
  const categories = categoriesRaw as Category[];
  const categoryName = categories.find((c) => c._id === profile?.categoryId)?.name;

  if (profileLoading || portfolioLoading) {
    return (
      <main className="min-h-screen">
        <DashboardNavbar role={role} activeItem={undefined} />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-(--color-brand)" />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen">
        <DashboardNavbar role={role} activeItem={undefined} />
        <div className="mx-auto mt-20 w-[min(100%-2rem,480px)] text-center">
          <p className="text-lg font-bold text-(--color-text-main)">Profile not found</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-(--color-brand-strong) hover:underline">Back to Dashboard</Link>
        </div>
      </main>
    );
  }

  const bg = avatarBg(profile.name);

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--color-accent-soft) 45%, transparent), transparent 36%), linear-gradient(165deg, var(--color-bg), color-mix(in srgb, var(--color-surface-strong) 84%, var(--color-bg)))",
      }}
    >
      <DashboardNavbar role={role} activeItem={undefined} />

      <div className="mx-auto w-[min(100%-1.5rem,860px)] space-y-4 py-5">
        {/* Header */}
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-(--color-surface) p-6">
          <div className="flex flex-wrap items-start gap-5">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full text-3xl font-bold text-white"
              style={{ backgroundColor: profile.avatarUrl ? "transparent" : bg }}
            >
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile.name} width={96} height={96} className="h-24 w-24 object-cover rounded-full" unoptimized />
              ) : (
                getInitials(profile.name)
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-(--color-text-main)">{profile.name}</h1>
              {profile.title && <p className="mt-0.5 text-base text-(--color-text-muted)">{profile.title}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {categoryName && (
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--color-brand-soft)_70%,var(--color-surface))] px-3 py-1 text-xs font-semibold text-(--color-brand-strong)">
                    {categoryName}
                  </span>
                )}
                {(profile.rating ?? 0) > 0 && (
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-(--color-text-main)">{profile.rating?.toFixed(1)}</span>
                  </span>
                )}
              </div>
            </div>

            {profile.hourlyRate != null && profile.hourlyRate > 0 && (
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold text-(--color-text-main)">${profile.hourlyRate}</p>
                <p className="text-xs text-(--color-text-muted)">/ hour</p>
              </div>
            )}
          </div>
        </div>

        {/* About */}
        {profile.bio && (
          <SectionCard title="About">
            <p className="whitespace-pre-wrap text-sm leading-7 text-(--color-text-main)">{profile.bio}</p>
          </SectionCard>
        )}

        {/* Portfolio */}
        {portfolio.length > 0 && (
          <SectionCard title="Portfolio">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {portfolio.map((p) => (
                <div key={p._id} className="cursor-pointer" onClick={() => setViewing(p)}>
                  <ProjectCard project={p} />
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Skills */}
        {(profile.skills?.length ?? 0) > 0 && (
          <SectionCard title="Skills">
            <div className="flex flex-wrap gap-2">
              {profile.skills!.map((s) => <SkillChip key={s} label={s} />)}
            </div>
          </SectionCard>
        )}

        {/* Experience */}
        {(profile.experience?.length ?? 0) > 0 && (
          <SectionCard title="Experience">
            <div className="flex flex-col gap-4">
              {profile.experience!.map((e, i) => <ExperienceItem key={e._id ?? i} entry={e} />)}
            </div>
          </SectionCard>
        )}

        {/* Education */}
        {(profile.education?.length ?? 0) > 0 && (
          <SectionCard title="Education">
            <div className="flex flex-col gap-4">
              {profile.education!.map((e, i) => <EducationItem key={e._id ?? i} entry={e} />)}
            </div>
          </SectionCard>
        )}
      </div>

      {viewing && <PortfolioProjectModal project={viewing} onClose={() => setViewing(null)} />}
    </main>
  );
}
