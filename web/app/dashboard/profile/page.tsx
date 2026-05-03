"use client";

import { useState } from "react";
import Link from "next/link";
import { setCredentials } from "@/lib/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  useCategoryControllerGetAllCategoriesQuery,
  useSkillsControllerGetAllQuery,
  useSkillsControllerGetByCategoryQuery,
  useUsersControllerFindMeQuery,
  useUsersControllerUpdateMyProfileMutation,
  usePortfolioGetMineQuery,
} from "@/lib/api";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import DashboardNavbar from "@/components/dashboard-navbar";
import ProfileHeader from "@/components/profile/profile-header";
import AboutSection from "@/components/profile/about-section";
import SkillsSection from "@/components/profile/skills-section";
import PortfolioSection from "@/components/profile/portfolio-section";
import ExperienceSection from "@/components/profile/experience-section";
import EducationSection from "@/components/profile/education-section";
import type { UserProfile, ExperienceEntry, EducationEntry, PortfolioProject } from "@/lib/types/profile";

type Category = { _id: string; name: string };

export default function DashboardProfilePage() {
  const dispatch = useAppDispatch();
  const { token, role, userId, email } = useAppSelector((s) => s.auth);

  const { data: categoriesRaw = [] } = useCategoryControllerGetAllCategoriesQuery();
  const { data: myProfileRaw, refetch: refetchProfile } = useUsersControllerFindMeQuery(undefined, { skip: !token });
  const { data: portfolioRaw, refetch: refetchPortfolio } = usePortfolioGetMineQuery(undefined, { skip: !token || role !== "FREELANCER" });

  const profile = myProfileRaw as UserProfile | undefined;
  const categoryId = profile?.categoryId;

  // Always fetch all skills immediately — they're the instant fallback.
  // Category-specific skills load in parallel once we know the categoryId.
  const { data: allSkillsRaw = [] } = useSkillsControllerGetAllQuery();
  const { data: categorySkillsRaw = [] } = useSkillsControllerGetByCategoryQuery(
    { categoryId: categoryId! },
    { skip: !categoryId },
  );

  const [updateProfile] = useUsersControllerUpdateMyProfileMutation();
  const [toastMsg, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const categories = categoriesRaw as Category[];
  const portfolioProjects = (portfolioRaw as PortfolioProject[] | undefined) ?? [];
  const skillSuggestions = categorySkillsRaw as Array<{ name?: unknown }>;
  const skillFallback = allSkillsRaw as Array<{ name?: unknown }>;
  const categoryName = categories.find((c) => c._id === categoryId)?.name;

  const showToast = (text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const save = async (partial: Record<string, unknown>) => {
    try {
      const updated = await updateProfile({ updateUserDto: partial as Parameters<typeof updateProfile>[0]["updateUserDto"] }).unwrap() as UserProfile;
      // Sync auth state if critical fields changed
      if (partial.skills || partial.categoryId) {
        dispatch(setCredentials({
          userId: userId!,
          role: role!,
          categoryId: (updated.categoryId ?? categoryId) as string,
          skills: (updated.skills ?? profile?.skills ?? []) as string[],
          token: token!,
          email: email!,
        }));
        if (updated.categoryId) localStorage.setItem("auth_category_id", updated.categoryId);
        localStorage.setItem("auth_skills", JSON.stringify(updated.skills ?? []));
      }
      await refetchProfile();
      showToast("Saved successfully");
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to save"), false);
      throw err;
    }
  };

  if (role !== "FREELANCER") {
    return (
      <main className="min-h-screen py-16">
        <div className="mx-auto w-[min(100%-2rem,560px)] text-center">
          <div className="rounded-3xl border border-(--color-border) bg-(--color-surface) p-10 shadow-xl">
            <p className="text-4xl">🔒</p>
            <h1 className="mt-4 text-2xl font-bold text-(--color-text-main)">Freelancer Profiles Only</h1>
            <p className="mt-2 text-sm text-(--color-text-muted)">Profile pages are for freelancer accounts.</p>
            <Link href="/dashboard" className="mt-6 inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-6 py-2.5 text-sm font-semibold text-white no-underline">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen">
        <DashboardNavbar role={role} activeItem="profile" />
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-(--color-border) border-t-(--color-brand)" />
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--color-accent-soft) 45%, transparent), transparent 36%), linear-gradient(165deg, var(--color-bg), color-mix(in srgb, var(--color-surface-strong) 84%, var(--color-bg)))",
      }}
    >
      <DashboardNavbar role={role} activeItem="profile" />

      <div className="mx-auto w-[min(100%-1.5rem,860px)] space-y-4 py-5">
        {/* Header */}
        <ProfileHeader
          profile={profile}
          categoryName={categoryName}
          onAvatarChange={async (url) => { await save({ avatarUrl: url }); }}
        />

        {/* About */}
        <AboutSection
          profile={profile}
          onSave={async (data) => { await save(data as Record<string, unknown>); }}
        />

        {/* Portfolio */}
        <PortfolioSection projects={portfolioProjects} onRefresh={refetchPortfolio} />

        {/* Skills */}
        <SkillsSection
          profile={profile}
          skillSuggestions={skillSuggestions}
          skillFallback={skillFallback}
          onSave={async (skills) => { await save({ skills }); }}
        />

        {/* Experience */}
        <ExperienceSection
          profile={profile}
          onSave={async (experience: ExperienceEntry[]) => { await save({ experience }); }}
        />

        {/* Education */}
        <EducationSection
          profile={profile}
          onSave={async (education: EducationEntry[]) => { await save({ education }); }}
        />
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl transition ${toastMsg.ok ? "bg-emerald-500" : "bg-red-500"}`}>
          {toastMsg.text}
        </div>
      )}
    </main>
  );
}
