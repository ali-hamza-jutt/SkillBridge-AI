"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { logout, setCredentials } from "@/lib/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  useCategoryControllerGetAllCategoriesQuery,
  useCategoryControllerGetSubCategoriesQuery,
  useSkillsControllerGetAllQuery,
  useSkillsControllerGetByCategoryQuery,
  useTasksControllerCreateMutation,
  useTasksControllerFindAllQuery,
  useTasksControllerGetMatchesQuery,
  useUsersControllerFindMeQuery,
  useUsersControllerUpdateMyProfileMutation,
} from "@/lib/api";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

type BudgetType = "hourly" | "fixed";
type ProjectType = "ongoing" | "one_time";
type ExperienceLevel = "entry" | "intermediate" | "expert";

type Category = {
  _id: string;
  name: string;
};

type SubCategory = {
  _id: string;
  name: string;
  categoryId: string;
};

type UserProfile = {
  _id: string;
  name: string;
  email: string;
  role: "FREELANCER" | "HIRER" | "ADMIN";
  categoryId?: string;
  skills?: string[];
};

type Task = {
  _id: string;
  clientId: string;
  title: string;
  description: string;
  budget: number;
  maxBudget?: number;
  budgetType: BudgetType;
  projectType: ProjectType;
  experienceLevel: ExperienceLevel;
  status: string;
  requiredSkills?: string[];
};

type CreateTaskFormValues = {
  title: string;
  description: string;
  budget: number;
  maxBudget?: number;
  budgetType: BudgetType;
  projectType: ProjectType;
  categoryId: string;
  subCategoryId: string;
  experienceLevel: ExperienceLevel;
};

type JobFilter = "ALL" | "OPEN" | "ONGOING";

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

const createTaskSchema: yup.ObjectSchema<CreateTaskFormValues> = yup
  .object({
    title: yup.string().trim().required("Title is required").min(4, "Title must be at least 4 characters"),
    description: yup
      .string()
      .trim()
      .required("Description is required")
      .min(20, "Description must be at least 20 characters"),
    budget: yup
      .number()
      .typeError("Budget must be a number")
      .required("Budget is required")
      .positive("Budget must be greater than zero"),
    maxBudget: yup
      .number()
      .transform((value, originalValue) => (originalValue === "" ? undefined : value))
      .optional()
      .min(yup.ref("budget"), "Max budget must be greater than or equal to budget"),
    budgetType: yup.mixed<BudgetType>().oneOf(["hourly", "fixed"]).required("Budget type is required"),
    projectType: yup.mixed<ProjectType>().oneOf(["ongoing", "one_time"]).required("Project type is required"),
    categoryId: yup.string().required("Category is required"),
    subCategoryId: yup.string().required("Sub-category is required"),
    experienceLevel: yup
      .mixed<ExperienceLevel>()
      .oneOf(["entry", "intermediate", "expert"])
      .required("Experience level is required"),
  })
  .required();

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, role, userId, categoryId, skills, email } = useAppSelector((state) => state.auth);

  const [activeFilter, setActiveFilter] = useState<JobFilter>("ALL");
  const [isPostJobOpen, setIsPostJobOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [taskSkillInput, setTaskSkillInput] = useState("");
  const [selectedTaskSkills, setSelectedTaskSkills] = useState<string[]>([]);

  const [profileName, setProfileName] = useState("");
  const [profileCategoryId, setProfileCategoryId] = useState("");
  const [profileSkills, setProfileSkills] = useState<string[]>([]);
  const [profileSkillInput, setProfileSkillInput] = useState("");
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTaskFormValues>({
    resolver: yupResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      budget: 0,
      maxBudget: undefined,
      budgetType: "fixed",
      projectType: "one_time",
      categoryId: "",
      subCategoryId: "",
      experienceLevel: "entry",
    },
  });

  const selectedCategoryId = watch("categoryId");

  const matchQuery =
    role === "FREELANCER" && categoryId
      ? {
          categoryId,
          subCategories: "",
          skills: skills.join(","),
        }
      : undefined;

  const { data: matchedTasksRaw, isFetching: isLoadingMatchedTasks } = useTasksControllerGetMatchesQuery(
    matchQuery as never,
    {
      skip: !token || role !== "FREELANCER" || !matchQuery,
    },
  );

  const {
    data: allTasksRaw,
    isFetching: isLoadingMyTasks,
    refetch: refetchMyTasks,
  } = useTasksControllerFindAllQuery(undefined, {
    skip: !token || role !== "HIRER",
  });

  const { data: categoriesRaw = [] } = useCategoryControllerGetAllCategoriesQuery();

  const { data: subCategoriesRaw = [] } = useCategoryControllerGetSubCategoriesQuery(
    { categoryId: selectedCategoryId },
    { skip: !selectedCategoryId },
  );

  const { data: taskSkillsRaw = [] } = useSkillsControllerGetByCategoryQuery(
    { categoryId: selectedCategoryId },
    { skip: !selectedCategoryId },
  );

  const { data: allSkillsRaw = [] } = useSkillsControllerGetAllQuery();

  const { data: myProfileRaw } = useUsersControllerFindMeQuery(undefined, {
    skip: !token,
  });

  const { data: profileSkillsRaw = [] } = useSkillsControllerGetByCategoryQuery(
    { categoryId: profileCategoryId },
    { skip: !token || role !== "FREELANCER" || !profileCategoryId },
  );

  const [createTask, { isLoading: isCreatingTask }] = useTasksControllerCreateMutation();
  const [updateUserProfile, { isLoading: isUpdatingProfile }] = useUsersControllerUpdateMyProfileMutation();

  const categories = categoriesRaw as Category[];
  const subCategories = subCategoriesRaw as SubCategory[];
  const allTasks = (allTasksRaw as Task[] | undefined) ?? [];
  const matchedTasks = (matchedTasksRaw as Task[] | undefined) ?? [];
  const categoryTaskSkills = toUniqueSkillNames(taskSkillsRaw);
  const allSkillNames = toUniqueSkillNames(allSkillsRaw);
  const suggestedTaskSkills = categoryTaskSkills.length > 0 ? categoryTaskSkills : allSkillNames;
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

  useEffect(() => {
    setSelectedTaskSkills([]);
    setTaskSkillInput("");
    setValue("subCategoryId", "");
  }, [selectedCategoryId, setValue]);

  const myTasks = useMemo(() => {
    if (!userId) {
      return [] as Task[];
    }
    return allTasks
      .filter((task) => task.clientId === userId)
      .sort((a, b) => (a._id > b._id ? -1 : 1));
  }, [allTasks, userId]);

  const filteredTasks = useMemo(() => {
    if (activeFilter === "OPEN") {
      return myTasks.filter((task) => task.status === "OPEN");
    }
    if (activeFilter === "ONGOING") {
      return myTasks.filter((task) => task.status === "ASSIGNED");
    }
    return myTasks;
  }, [activeFilter, myTasks]);

  const filteredTaskSkillSuggestions = useMemo(() => {
    return filterSuggestions(suggestedTaskSkills, selectedTaskSkills, taskSkillInput);
  }, [selectedTaskSkills, suggestedTaskSkills, taskSkillInput]);

  const filteredProfileSkillSuggestions = useMemo(() => {
    return filterSuggestions(suggestedProfileSkills, profileSkills, profileSkillInput);
  }, [profileSkillInput, profileSkills, suggestedProfileSkills]);

  const signOut = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_email");
    localStorage.removeItem("auth_user_id");
    localStorage.removeItem("auth_role");
    localStorage.removeItem("auth_category_id");
    localStorage.removeItem("auth_skills");
    dispatch(logout());
    router.push("/login");
  };

  const addEmployerSkill = (skill: string) => {
    if (!selectedTaskSkills.includes(skill)) {
      setSelectedTaskSkills((prev) => [...prev, skill]);
    }
    setTaskSkillInput("");
  };

  const removeEmployerSkill = (skill: string) => {
    setSelectedTaskSkills((prev) => prev.filter((s) => s !== skill));
  };

  const addMatchingTaskSkillFromInput = () => {
    const skillToAdd = pickMatchingSuggestion(taskSkillInput, filteredTaskSkillSuggestions);

    if (skillToAdd) {
      addEmployerSkill(skillToAdd);
    }
  };

  const onTaskSkillInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addMatchingTaskSkillFromInput();
  };

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

  const onCreateTask = async (values: CreateTaskFormValues) => {
    try {
      setFormError(null);
      setFormStatus(null);

      await createTask({
        createTaskDto: {
          title: values.title,
          description: values.description,
          budget: Number(values.budget),
          maxBudget: values.maxBudget ? Number(values.maxBudget) : undefined,
          budgetType: values.budgetType,
          projectType: values.projectType,
          categoryId: values.categoryId,
          subCategoryId: values.subCategoryId,
          requiredSkills: selectedTaskSkills,
          experienceLevel: values.experienceLevel,
        },
      }).unwrap();

      reset({
        title: "",
        description: "",
        budget: 0,
        maxBudget: undefined,
        budgetType: "fixed",
        projectType: "one_time",
        categoryId: "",
        subCategoryId: "",
        experienceLevel: "entry",
      });
      setSelectedTaskSkills([]);
      setTaskSkillInput("");
      refetchMyTasks();
      setFormStatus("Job posted successfully.");
      setTimeout(() => {
        setIsPostJobOpen(false);
        setFormStatus(null);
      }, 900);
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Failed to create task. Please try again."));
    }
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

  const formatStatusLabel = (status: string) => {
    if (status === "ASSIGNED") {
      return "ONGOING";
    }
    return status;
  };

  const getStatusClassName = (status: string) => {
    if (status === "OPEN") {
      return "border-[color-mix(in_srgb,var(--color-brand)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_70%,var(--color-surface))] text-[var(--color-brand-strong)]";
    }
    if (status === "ASSIGNED") {
      return "border-[color-mix(in_srgb,var(--color-accent)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-soft)_72%,var(--color-surface))] text-[color-mix(in_srgb,var(--color-text-main)_90%,#3b2f12)]";
    }
    return "border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] text-[var(--color-text-muted)]";
  };

  const inputClassName =
    "mt-1 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-main)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--color-text-muted)_86%,transparent)] focus:border-[color-mix(in_srgb,var(--color-brand)_58%,var(--color-border))] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand-soft)_75%,transparent)]";
  const labelClassName = "text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]";

  if (!token) {
    return (
      <main
        className="min-h-screen py-10"
        style={{
          background:
            "radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--color-brand-soft) 58%, transparent), transparent 34%), linear-gradient(165deg, var(--color-bg), color-mix(in srgb, var(--color-surface-strong) 84%, var(--color-bg)))",
        }}
      >
        <div className="mx-auto w-[min(100%-2rem,980px)]">
          <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-6 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)] backdrop-blur-md md:p-8">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-main)]">Dashboard Access Requires Login</h1>
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">Please log in first to access your personalized dashboard.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white no-underline"
              >
                Go to Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-brand-soft))] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-main)] no-underline"
              >
                Create Account
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (role === "FREELANCER") {
    return (
      <main
        className="min-h-screen"
        style={{
          background:
            "radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--color-accent-soft) 50%, transparent), transparent 34%), linear-gradient(165deg, var(--color-bg), color-mix(in srgb, var(--color-surface-strong) 84%, var(--color-bg)))",
        }}
      >
        <header className="sticky top-0 z-20 border-b border-[color-mix(in_srgb,var(--color-border)_88%,transparent)] bg-[color-mix(in_srgb,var(--color-bg)_84%,transparent)] backdrop-blur-xl">
          <div className="mx-auto flex w-[min(100%-2rem,1200px)] items-center justify-between gap-3 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight text-[var(--color-text-main)] no-underline">
              SkillBridge
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-brand-soft)_66%,var(--color-surface))] px-4 py-2 text-sm font-semibold text-[var(--color-brand-strong)]" type="button">
                Jobs
              </button>
              <button className="rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-4 py-2 text-sm font-semibold text-[var(--color-text-main)]" type="button">
                Messages
              </button>
              <button className="rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-4 py-2 text-sm font-semibold text-[var(--color-text-main)]" type="button">
                Profile
              </button>
              <button
                onClick={signOut}
                className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-brand-soft))] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-main)]"
                type="button"
              >
                Log Out
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto grid w-[min(100%-2rem,1200px)] gap-5 py-5 md:grid-cols-[1.6fr_1fr]">
          <section className="grid gap-4">
            {isLoadingMatchedTasks ? <p className="text-sm text-[var(--color-text-muted)]">Loading jobs...</p> : null}
            {!isLoadingMatchedTasks && matchedTasks.length === 0 ? (
              <article className="rounded-3xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] p-8 text-center shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">No jobs available yet</h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">Update your profile skills to improve job recommendations.</p>
              </article>
            ) : null}

            {matchedTasks.map((task) => (
              <article
                key={task._id}
                className="w-full rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="m-0 text-xl font-bold tracking-tight text-[var(--color-text-main)]">{task.title}</h3>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] ${getStatusClassName(task.status)}`}
                  >
                    {formatStatusLabel(task.status)}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--color-text-muted)]">{task.description}</p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-2.5 py-1 text-[var(--color-text-main)]">
                    {task.budgetType === "hourly" ? "Hourly" : "Fixed"}
                  </span>
                  <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-2.5 py-1 text-[var(--color-text-main)]">
                    ${task.budget}
                    {typeof task.maxBudget === "number" ? ` - $${task.maxBudget}` : ""}
                  </span>
                  <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-2.5 py-1 text-[var(--color-text-main)]">
                    {task.projectType === "one_time" ? "One-time" : "Ongoing"}
                  </span>
                </div>
              </article>
            ))}
          </section>

          <aside className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
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
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 8% 0%, color-mix(in srgb, var(--color-brand-soft) 50%, transparent), transparent 34%), radial-gradient(circle at 96% 8%, color-mix(in srgb, var(--color-accent-soft) 42%, transparent), transparent 44%), linear-gradient(160deg, var(--color-bg), color-mix(in srgb, var(--color-surface-strong) 86%, var(--color-bg)))",
      }}
    >
      <header className="sticky top-0 z-20 border-b border-[color-mix(in_srgb,var(--color-border)_88%,transparent)] bg-[color-mix(in_srgb,var(--color-bg)_84%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex w-[min(100%-2rem,1200px)] items-center justify-between gap-3 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight text-[var(--color-text-main)] no-underline">
            SkillBridge
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-brand-strong)_92%,#0d7000),var(--color-brand))]"
              onClick={() => {
                setFormError(null);
                setFormStatus(null);
                setIsPostJobOpen(true);
              }}
            >
              Post a Job
            </button>
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-brand-soft))] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-main)] transition hover:bg-[color-mix(in_srgb,var(--color-surface)_75%,var(--color-brand-soft))]"
              type="button"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-[min(100%-2rem,1200px)] gap-5 py-5">
        <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-4 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)] backdrop-blur-md md:p-5">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">My Jobs</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["ALL", "OPEN", "ONGOING"] as JobFilter[]).map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-[color-mix(in_srgb,var(--color-brand)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_78%,var(--color-surface))] text-[var(--color-brand-strong)]"
                      : "border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] text-[var(--color-text-main)] hover:bg-[color-mix(in_srgb,var(--color-surface)_72%,var(--color-brand-soft))]"
                  }`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter === "ALL" ? "All Jobs" : filter === "OPEN" ? "Open Jobs" : "Ongoing Jobs"}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4">
          {isLoadingMyTasks ? <p className="text-sm text-[var(--color-text-muted)]">Loading your jobs...</p> : null}

          {!isLoadingMyTasks && filteredTasks.length === 0 ? (
            <article className="rounded-3xl border border-dashed border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] p-8 text-center shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
              <p className="m-0 text-3xl text-[var(--color-text-muted)]" aria-hidden="true">o</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-text-main)]">No jobs in this view</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">Use Post a Job to create your first listing.</p>
              <button
                type="button"
                className="mt-6 inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white"
                onClick={() => setIsPostJobOpen(true)}
              >
                Post Your First Job
              </button>
            </article>
          ) : null}

          {filteredTasks.map((task) => (
            <article
              key={task._id}
              className="w-full rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="m-0 text-xl font-bold tracking-tight text-[var(--color-text-main)]">{task.title}</h3>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] ${getStatusClassName(task.status)}`}
                >
                  {formatStatusLabel(task.status)}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--color-text-muted)]">{task.description}</p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-2.5 py-1 text-[var(--color-text-main)]">
                  {task.budgetType === "hourly" ? "Hourly" : "Fixed"}
                </span>
                <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-2.5 py-1 text-[var(--color-text-main)]">
                  ${task.budget}
                  {typeof task.maxBudget === "number" ? ` - $${task.maxBudget}` : ""}
                </span>
                <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-2.5 py-1 text-[var(--color-text-main)]">
                  {task.projectType === "one_time" ? "One-time" : "Ongoing"}
                </span>
                <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-2.5 py-1 text-[var(--color-text-main)] capitalize">
                  {task.experienceLevel}
                </span>
              </div>

              {task.requiredSkills?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {task.requiredSkills.map((skill) => (
                    <span
                      key={`${task._id}-${skill}`}
                      className="rounded-full border border-[color-mix(in_srgb,var(--color-brand)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_68%,var(--color-surface))] px-2.5 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--color-brand-strong)_88%,var(--color-text-main))]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      </div>

      {isPostJobOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[color-mix(in_srgb,var(--color-bg)_38%,#000)] px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Post a job"
        >
          <div className="w-full max-w-3xl rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_95%,transparent)] p-5 shadow-[0_26px_56px_-36px_rgba(15,23,42,0.4)] md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">Post a Job</h2>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] text-lg text-[var(--color-text-main)] transition hover:bg-[color-mix(in_srgb,var(--color-surface)_72%,var(--color-brand-soft))]"
                onClick={() => setIsPostJobOpen(false)}
                aria-label="Close post job form"
              >
                x
              </button>
            </div>

            <form className="mt-4 grid gap-4" onSubmit={handleSubmit(onCreateTask)}>
              <div>
                <label className={labelClassName} htmlFor="title">Title</label>
                <input id="title" className={inputClassName} {...register("title")} placeholder="Build a Next.js admin panel" />
                {errors.title ? <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.title.message}</p> : null}
              </div>

              <div>
                <label className={labelClassName} htmlFor="description">Description</label>
                <textarea
                  id="description"
                  className={inputClassName}
                  rows={4}
                  {...register("description")}
                  placeholder="Describe scope, timelines, and deliverables"
                />
                {errors.description ? <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.description.message}</p> : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName} htmlFor="budget">Budget</label>
                  <input id="budget" type="number" className={inputClassName} {...register("budget")} />
                  {errors.budget ? <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.budget.message}</p> : null}
                </div>
                <div>
                  <label className={labelClassName} htmlFor="maxBudget">Max Budget (optional)</label>
                  <input id="maxBudget" type="number" className={inputClassName} {...register("maxBudget")} />
                  {errors.maxBudget ? <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.maxBudget.message}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName} htmlFor="budgetType">Budget Type</label>
                  <select id="budgetType" className={inputClassName} {...register("budgetType")}>
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
                <div>
                  <label className={labelClassName} htmlFor="projectType">Project Type</label>
                  <select id="projectType" className={inputClassName} {...register("projectType")}>
                    <option value="one_time">One Time</option>
                    <option value="ongoing">Ongoing</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClassName} htmlFor="categoryId">Category</label>
                  <select id="categoryId" className={inputClassName} {...register("categoryId")}>
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>{category.name}</option>
                    ))}
                  </select>
                  {errors.categoryId ? <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.categoryId.message}</p> : null}
                </div>

                <div>
                  <label className={labelClassName} htmlFor="subCategoryId">Sub-category</label>
                  <select id="subCategoryId" className={inputClassName} {...register("subCategoryId")}>
                    <option value="">Select sub-category</option>
                    {subCategories.map((subCategory) => (
                      <option key={subCategory._id} value={subCategory._id}>{subCategory.name}</option>
                    ))}
                  </select>
                  {errors.subCategoryId ? <p className="mt-1 text-sm text-[var(--color-danger)]">{errors.subCategoryId.message}</p> : null}
                </div>
              </div>

              <div>
                <label className={labelClassName} htmlFor="requiredSkills">Required Skills</label>
                <input
                  id="requiredSkills"
                  className={inputClassName}
                  value={taskSkillInput}
                  onChange={(e) => setTaskSkillInput(e.target.value)}
                  onKeyDown={onTaskSkillInputKeyDown}
                  placeholder="Type to search e.g. React"
                  disabled={!selectedCategoryId}
                />

                {selectedCategoryId && taskSkillInput.trim().length > 0 && filteredTaskSkillSuggestions.length > 0 ? (
                  <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-auto">
                    {filteredTaskSkillSuggestions.slice(0, 25).map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--color-text-main)]"
                        onClick={() => addEmployerSkill(skill)}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                ) : null}

                {selectedCategoryId && taskSkillInput.trim().length > 0 && filteredTaskSkillSuggestions.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">No matching skills found.</p>
                ) : null}

                {selectedTaskSkills.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedTaskSkills.map((skill) => (
                      <span key={skill} className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-brand)_24%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_68%,var(--color-surface))] px-2.5 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--color-brand-strong)_88%,var(--color-text-main))]">
                        {skill}
                        <button
                          type="button"
                          className="rounded-full px-1 text-[var(--color-brand-strong)]"
                          onClick={() => removeEmployerSkill(skill)}
                          aria-label={`Remove ${skill}`}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {selectedCategoryId && subCategories.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  No sub-categories found for this category.
                </p>
              ) : null}

              <div>
                <label className={labelClassName} htmlFor="experienceLevel">Experience Level</label>
                <select id="experienceLevel" className={inputClassName} {...register("experienceLevel")}>
                  <option value="entry">Entry</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              {formError ? (
                <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger-soft)_80%,var(--color-surface))] px-3 py-2 text-sm text-[var(--color-danger)]">
                  {formError}
                </p>
              ) : null}
              {formStatus ? (
                <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-brand)_32%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_72%,var(--color-surface))] px-3 py-2 text-sm text-[var(--color-brand-strong)]">
                  {formStatus}
                </p>
              ) : null}

              <div className="mt-1 flex flex-wrap justify-end gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                  type="submit"
                  disabled={isCreatingTask}
                >
                  {isCreatingTask ? "Posting..." : "Post Job"}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-brand-soft))] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-main)]"
                  onClick={() => setIsPostJobOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
