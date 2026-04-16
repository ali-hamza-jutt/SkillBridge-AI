"use client";

import Link from "next/link";
import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { setCredentials } from "@/lib/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  useCategoryControllerGetAllCategoriesQuery,
  useSkillsControllerGetByCategoryQuery,
  useUsersControllerFindMeQuery,
  useUsersControllerUpdateMyProfileMutation,
} from "@/lib/api";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import DashboardNavbar from "@/components/dashboard-navbar";

type Category = {
  _id: string;
  name: string;
};

type UserProfile = {
  _id: string;
  name: string;
  email: string;
  role: "FREELANCER" | "HIRER" | "ADMIN";
  categoryId?: string;
  skills?: string[];
};

const toUniqueSkillNames = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) {
    return [];
  }

  const names = raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }

      const value = (item as { name?: unknown }).name;
      return typeof value === "string" ? value.trim() : "";
    })
    .filter((name) => name.length > 0);

  return [...new Set(names)];
};

const filterSuggestions = (allSkills: string[], selectedSkills: string[], input: string) => {
  const query = input.trim().toLowerCase();
  const selected = new Set(selectedSkills.map((skill) => skill.toLowerCase()));

  return allSkills.filter(
    (skill) => !selected.has(skill.toLowerCase()) && (query.length === 0 || skill.toLowerCase().includes(query)),
  );
};

const pickMatchingSuggestion = (input: string, suggestions: string[]) => {
  const query = input.trim().toLowerCase();
  if (!query) {
    return undefined;
  }

  return suggestions.find((skill) => skill.toLowerCase() === query) ?? suggestions[0];
};

export default function DashboardProfilePage() {
  const dispatch = useAppDispatch();
  const { token, role, userId, email } = useAppSelector((state) => state.auth);

  const [profileName, setProfileName] = useState("");
  const [profileCategoryId, setProfileCategoryId] = useState("");
  const [profileSkills, setProfileSkills] = useState<string[]>([]);
  const [profileSkillInput, setProfileSkillInput] = useState("");
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const { data: categoriesRaw = [] } = useCategoryControllerGetAllCategoriesQuery();

  const { data: myProfileRaw } = useUsersControllerFindMeQuery(undefined, {
    skip: !token,
  });

  const { data: profileSkillsRaw = [] } = useSkillsControllerGetByCategoryQuery(
    { categoryId: profileCategoryId },
    { skip: !token || role !== "FREELANCER" || !profileCategoryId },
  );

  const [updateUserProfile, { isLoading: isUpdatingProfile }] = useUsersControllerUpdateMyProfileMutation();

  const categories = categoriesRaw as Category[];
  const suggestedProfileSkills = toUniqueSkillNames(profileSkillsRaw);
  const myProfile = (myProfileRaw as UserProfile | undefined) ?? undefined;

  useEffect(() => {
    if (!myProfile || role !== "FREELANCER") {
      return;
    }

    setProfileName(myProfile.name ?? "");
    setProfileCategoryId(myProfile.categoryId ?? "");
    setProfileSkills(myProfile.skills ?? []);
  }, [myProfile, role]);

  const filteredProfileSkillSuggestions = useMemo(() => {
    return filterSuggestions(suggestedProfileSkills, profileSkills, profileSkillInput);
  }, [profileSkillInput, profileSkills, suggestedProfileSkills]);

  const addProfileSkill = (skill: string) => {
    if (!profileSkills.includes(skill)) {
      setProfileSkills((prev) => [...prev, skill]);
    }
    setProfileSkillInput("");
  };

  const removeProfileSkill = (skill: string) => {
    setProfileSkills((prev) => prev.filter((s) => s !== skill));
  };

  const addMatchingProfileSkillFromInput = () => {
    const skillToAdd = pickMatchingSuggestion(profileSkillInput, filteredProfileSkillSuggestions);

    if (skillToAdd) {
      addProfileSkill(skillToAdd);
    }
  };

  const onProfileSkillInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addMatchingProfileSkillFromInput();
  };

  const onSaveFreelancerProfile = async () => {
    if (!userId || !token) {
      return;
    }

    try {
      setProfileError(null);
      setProfileStatus(null);

      await updateUserProfile({
        updateUserDto: {
          name: profileName,
          categoryId: profileCategoryId,
          skills: profileSkills,
        },
      }).unwrap();

      dispatch(
        setCredentials({
          userId,
          role,
          categoryId: profileCategoryId,
          skills: profileSkills,
          token,
          email,
        }),
      );

      if (profileCategoryId) {
        localStorage.setItem("auth_category_id", profileCategoryId);
      } else {
        localStorage.removeItem("auth_category_id");
      }
      localStorage.setItem("auth_skills", JSON.stringify(profileSkills));

      setProfileStatus("Profile updated successfully.");
    } catch (error) {
      setProfileError(getApiErrorMessage(error, "Failed to update profile."));
    }
  };

  const inputClassName =
    "mt-1 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-main)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--color-text-muted)_86%,transparent)] focus:border-[color-mix(in_srgb,var(--color-brand)_58%,var(--color-border))] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand-soft)_75%,transparent)]";
  const labelClassName = "text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]";

  if (!token) {
    return (
      <main className="min-h-screen py-10">
        <div className="mx-auto w-[min(100%-2rem,980px)]">
          <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-6 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)] backdrop-blur-md md:p-8">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-main)]">Dashboard Access Requires Login</h1>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">Please log in first to access your profile.</p>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white no-underline"
              >
                Go to Login
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (role !== "FREELANCER") {
    return (
      <main className="min-h-screen py-10">
        <div className="mx-auto w-[min(100%-2rem,980px)]">
          <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-6 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)] backdrop-blur-md md:p-8">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-main)]">Profile Page Is For Freelancers</h1>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">Return to dashboard for your role-specific workspace.</p>
            <div className="mt-6">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white no-underline"
              >
                Go to Dashboard
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--color-accent-soft) 50%, transparent), transparent 34%), linear-gradient(165deg, var(--color-bg), color-mix(in srgb, var(--color-surface-strong) 84%, var(--color-bg)))",
      }}
    >
      <DashboardNavbar role={role} activeItem="profile" />

      <div className="mx-auto w-[min(100%-2rem,900px)] py-5">
        <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-main)]">Profile</h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Keep your category and skills updated to get better job matches.</p>

          <div className="mt-4 grid gap-4">
            <div>
              <label className={labelClassName} htmlFor="profileName">Name</label>
              <input
                id="profileName"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className={inputClassName}
                placeholder="Your name"
              />
            </div>

            <div>
              <label className={labelClassName} htmlFor="profileCategory">Category</label>
              <select
                id="profileCategory"
                value={profileCategoryId}
                onChange={(e) => {
                  setProfileCategoryId(e.target.value);
                  setProfileSkills([]);
                  setProfileSkillInput("");
                }}
                className={inputClassName}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClassName} htmlFor="profileSkills">Skills</label>
              <input
                id="profileSkills"
                className={inputClassName}
                value={profileSkillInput}
                onChange={(e) => setProfileSkillInput(e.target.value)}
                onKeyDown={onProfileSkillInputKeyDown}
                placeholder="Type to search e.g. React"
                disabled={!profileCategoryId}
              />

              {profileCategoryId && profileSkillInput.trim().length > 0 && filteredProfileSkillSuggestions.length > 0 ? (
                <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-auto">
                  {filteredProfileSkillSuggestions.slice(0, 20).map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--color-text-main)]"
                      onClick={() => addProfileSkill(skill)}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              ) : null}

              {profileSkills.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {profileSkills.map((skill) => (
                    <span key={skill} className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-brand)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_68%,var(--color-surface))] px-2.5 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--color-brand-strong)_88%,var(--color-text-main))]">
                      {skill}
                      <button
                        type="button"
                        className="rounded-full px-1 text-[var(--color-brand-strong)]"
                        onClick={() => removeProfileSkill(skill)}
                        aria-label={`Remove ${skill}`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {profileError ? (
              <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger-soft)_80%,var(--color-surface))] px-3 py-2 text-sm text-[var(--color-danger)]">
                {profileError}
              </p>
            ) : null}
            {profileStatus ? (
              <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_32%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_72%,var(--color-surface))] px-3 py-2 text-sm text-[var(--color-brand-strong)]">
                {profileStatus}
              </p>
            ) : null}

            <button
              type="button"
              onClick={onSaveFreelancerProfile}
              disabled={isUpdatingProfile}
              className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUpdatingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
