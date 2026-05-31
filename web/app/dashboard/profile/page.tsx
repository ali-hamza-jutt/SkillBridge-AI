"use client";

import Link from "next/link";
import { toast } from "sonner";
import { setCredentials } from "@/lib/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  useCategoryControllerGetAllCategoriesQuery,
  useSkillsControllerGetAllQuery,
  useSkillsControllerGetByCategoryQuery,
  useUsersControllerFindMeQuery,
  useUsersControllerUpdateMyProfileMutation,
  usePortfolioControllerFindMineQuery,
} from "@/lib/api";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import DashboardNavbar from "@/components/dashboard-navbar";
import ProfileHeader from "@/components/profile/profile-header";
import EmployerProfileEditor from "@/components/profile/employer-profile-editor";
import AboutSection from "@/components/profile/about-section";
import SkillsSection from "@/components/profile/skills-section";
import PortfolioSection from "@/components/profile/portfolio-section";
import ExperienceSection from "@/components/profile/experience-section";
import EducationSection from "@/components/profile/education-section";
import type { UserProfile, ExperienceEntry, EducationEntry, PortfolioProject } from "@/lib/types/profile";

type Category = { _id: string; name: string };

export default function DashboardProfilePage() {
  const dispatch = useAppDispatch();
  const { token, role, userId, email, avatarUrl: storedAvatarUrl } = useAppSelector((s) => s.auth);

  const { data: categoriesRaw = [] } = useCategoryControllerGetAllCategoriesQuery();
  const { data: myProfileRaw, refetch: refetchProfile } = useUsersControllerFindMeQuery(undefined, { skip: !token });
  const { data: portfolioRaw, refetch: refetchPortfolio } = usePortfolioControllerFindMineQuery(undefined, { skip: !token || role !== "FREELANCER" });

  const profile = myProfileRaw as UserProfile | undefined;
  const categoryId = profile?.categoryId;
  const isEmployer = role === "HIRER";

  const { data: allSkillsRaw = [] } = useSkillsControllerGetAllQuery();
  const { data: categorySkillsRaw = [] } = useSkillsControllerGetByCategoryQuery(
    { categoryId: categoryId! },
    { skip: !categoryId },
  );

  const [updateProfile] = useUsersControllerUpdateMyProfileMutation();

  const categories = categoriesRaw as Category[];
  const portfolioProjects = (portfolioRaw as PortfolioProject[] | undefined) ?? [];
  const skillSuggestions = categorySkillsRaw as Array<{ name?: unknown }>;
  const skillFallback = allSkillsRaw as Array<{ name?: unknown }>;
  const categoryName = categories.find((c) => c._id === categoryId)?.name;

  const save = async (partial: Record<string, unknown>) => {
    try {
      const updated = (await updateProfile({ updateUserDto: partial as Parameters<typeof updateProfile>[0]["updateUserDto"] }).unwrap()) as UserProfile;

      const newAvatarUrl = (partial.avatarUrl as string | undefined) ?? updated.avatarUrl ?? storedAvatarUrl;
      const nextCategoryId = updated.categoryId ?? profile?.categoryId ?? null;

      dispatch(setCredentials({
        userId: userId!,
        role: role!,
        categoryId: nextCategoryId,
        skills: (updated.skills ?? profile?.skills ?? []) as string[],
        avatarUrl: newAvatarUrl ?? null,
        token: token!,
        email: email!,
      }));

      if (nextCategoryId) {
        localStorage.setItem("auth_category_id", nextCategoryId);
      } else {
        localStorage.removeItem("auth_category_id");
      }
      localStorage.setItem("auth_skills", JSON.stringify(updated.skills ?? []));
      if (newAvatarUrl) localStorage.setItem("auth_avatar_url", newAvatarUrl);

      await refetchProfile();
      toast.success("Saved successfully");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save"));
      throw err;
    }
  };

  if (role !== "FREELANCER" && role !== "HIRER") {
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
    <main className="min-h-screen bg-(--color-bg)">
      <DashboardNavbar role={role} activeItem="profile" />

      <div className="mx-auto w-[min(100%-1.5rem,860px)] space-y-4 py-5">
        {isEmployer ? (
          <EmployerProfileEditor
            profile={profile}
            onSave={async (data) => { await save(data as Record<string, unknown>); }}
          />
        ) : (
          <>
            <ProfileHeader
              profile={profile}
              categoryName={categoryName}
              onAvatarChange={async (url) => { await save({ avatarUrl: url }); }}
            />
            <AboutSection
              profile={profile}
              onSave={async (data) => { await save(data as Record<string, unknown>); }}
            />
            <PortfolioSection projects={portfolioProjects} onRefresh={refetchPortfolio} />
            <SkillsSection
              profile={profile}
              skillSuggestions={skillSuggestions}
              skillFallback={skillFallback}
              onSave={async (skills) => { await save({ skills }); }}
            />
            <ExperienceSection
              profile={profile}
              onSave={async (experience: ExperienceEntry[]) => { await save({ experience }); }}
            />
            <EducationSection
              profile={profile}
              onSave={async (education: EducationEntry[]) => { await save({ education }); }}
            />
          </>
        )}
      </div>
    </main>
  );
}
