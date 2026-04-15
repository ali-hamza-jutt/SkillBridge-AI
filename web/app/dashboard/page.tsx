"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { logout } from "@/lib/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  useCategoryControllerGetAllCategoriesQuery,
  useCategoryControllerGetSubCategoriesQuery,
  useTasksControllerCreateMutation,
  useTasksControllerFindAllQuery,
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
  requiredSkills: string;
  experienceLevel: ExperienceLevel;
};

type JobFilter = "ALL" | "OPEN" | "ONGOING";

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
    requiredSkills: yup.string().default(""),
    experienceLevel: yup
      .mixed<ExperienceLevel>()
      .oneOf(["entry", "intermediate", "expert"])
      .required("Experience level is required"),
  })
  .required();

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, role, userId } = useAppSelector((state) => state.auth);
  const [activeFilter, setActiveFilter] = useState<JobFilter>("ALL");
  const [isPostJobOpen, setIsPostJobOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
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
      requiredSkills: "",
      experienceLevel: "entry",
    },
  });

  const selectedCategoryId = watch("categoryId");

  const {
    data: allTasksRaw,
    isFetching: isLoadingMyTasks,
    refetch: refetchMyTasks,
  } = useTasksControllerFindAllQuery(undefined, {
    skip: !token || role !== "HIRER",
  });

  const { data: categoriesRaw = [] } = useCategoryControllerGetAllCategoriesQuery(undefined, {
    skip: role !== "HIRER",
  });

  const { data: subCategoriesRaw = [] } = useCategoryControllerGetSubCategoriesQuery(
    { categoryId: selectedCategoryId },
    { skip: !selectedCategoryId || role !== "HIRER" },
  );

  const [createTask, { isLoading: isCreatingTask }] = useTasksControllerCreateMutation();

  const categories = categoriesRaw as Category[];
  const subCategories = subCategoriesRaw as SubCategory[];
  const allTasks = (allTasksRaw as Task[] | undefined) ?? [];

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

  const signOut = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_email");
    localStorage.removeItem("auth_user_id");
    localStorage.removeItem("auth_role");
    dispatch(logout());
    router.push("/login");
  };

  const onCreateTask = async (values: CreateTaskFormValues) => {
    try {
      setFormError(null);
      setFormStatus(null);
      const requiredSkills = values.requiredSkills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean);

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
          requiredSkills,
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
        requiredSkills: "",
        experienceLevel: "entry",
      });
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

  const formatStatusLabel = (status: string) => {
    if (status === "ASSIGNED") {
      return "ONGOING";
    }
    return status;
  };

  if (!token) {
    return (
      <main className="app-root py-10">
        <div className="site-shell">
          <section className="surface-card hero-panel">
            <h1 className="section-title">Dashboard Access Requires Login</h1>
            <p className="muted-copy mt-3">Please log in first to access your personalized dashboard.</p>
            <div className="mt-6 flex gap-3">
              <Link href="/login" className="btn btn-primary">Go to Login</Link>
              <Link href="/signup" className="btn btn-secondary">Create Account</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (role && role !== "HIRER") {
    return (
      <main className="app-root py-10">
        <div className="site-shell">
          <section className="surface-card hero-panel">
            <h1 className="section-title">Freelancer Dashboard</h1>
            <p className="muted-copy mt-3">
              This dashboard section is for hirers to manage posted jobs. You are signed in as a freelancer.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/" className="btn btn-primary">Go Home</Link>
              <button onClick={signOut} className="btn btn-secondary" type="button">Log Out</button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="app-root hirer-root">
      <header className="hirer-nav-wrap">
        <div className="site-shell hirer-nav">
          <Link href="/" className="site-brand brand-mark">SkillBridge</Link>
          <div className="hirer-nav-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setFormError(null);
                setFormStatus(null);
                setIsPostJobOpen(true);
              }}
            >
              Post a Job
            </button>
            <button onClick={signOut} className="btn btn-secondary" type="button">Log Out</button>
          </div>
        </div>
      </header>

      <div className="site-shell hirer-main">
        <section className="hirer-filters surface-card">
          <p className="hirer-filter-label">My Jobs</p>
          <div className="hirer-filter-row">
            <button
              type="button"
              className={`hirer-filter-pill ${activeFilter === "ALL" ? "is-active" : ""}`}
              onClick={() => setActiveFilter("ALL")}
            >
              All Jobs
            </button>
            <button
              type="button"
              className={`hirer-filter-pill ${activeFilter === "OPEN" ? "is-active" : ""}`}
              onClick={() => setActiveFilter("OPEN")}
            >
              Open Jobs
            </button>
            <button
              type="button"
              className={`hirer-filter-pill ${activeFilter === "ONGOING" ? "is-active" : ""}`}
              onClick={() => setActiveFilter("ONGOING")}
            >
              Ongoing Jobs
            </button>
          </div>
        </section>

        <section className="hirer-jobs-grid">
          {isLoadingMyTasks ? <p className="muted-copy">Loading your jobs...</p> : null}
          {!isLoadingMyTasks && filteredTasks.length === 0 ? (
            <article className="surface-card hirer-empty">
              <p className="hirer-empty-icon" aria-hidden="true">○</p>
              <h2 className="section-title">No jobs in this view</h2>
              <p className="muted-copy mt-2">Use Post a Job to create your first listing.</p>
              <button type="button" className="btn btn-primary mt-6" onClick={() => setIsPostJobOpen(true)}>
                Post Your First Job
              </button>
            </article>
          ) : null}

          {filteredTasks.map((task) => (
            <article key={task._id} className="surface-card hirer-job-card">
              <div className="hirer-job-top">
                <h3 className="hirer-job-title">{task.title}</h3>
                <span className={`hirer-status hirer-status-${task.status.toLowerCase()}`}>
                  {formatStatusLabel(task.status)}
                </span>
              </div>

              <p className="hirer-job-desc">{task.description}</p>

              <div className="hirer-meta-row">
                <span>{task.budgetType === "hourly" ? "Hourly" : "Fixed"}</span>
                <span>${task.budget}{typeof task.maxBudget === "number" ? ` - $${task.maxBudget}` : ""}</span>
                <span>{task.projectType === "one_time" ? "One-time" : "Ongoing"}</span>
                <span>{task.experienceLevel}</span>
              </div>

              {task.requiredSkills?.length ? (
                <div className="hirer-skill-row">
                  {task.requiredSkills.map((skill) => (
                    <span key={`${task._id}-${skill}`} className="hirer-skill-chip">{skill}</span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      </div>

      {isPostJobOpen ? (
        <div className="hirer-modal-backdrop" role="dialog" aria-modal="true" aria-label="Post a job">
          <div className="hirer-modal surface-card">
            <div className="hirer-modal-head">
              <h2 className="section-title">Post a Job</h2>
              <button
                type="button"
                className="hirer-close"
                onClick={() => setIsPostJobOpen(false)}
                aria-label="Close post job form"
              >
                ×
              </button>
            </div>

            <form className="field-stack mt-4" onSubmit={handleSubmit(onCreateTask)}>
              <div>
                <label className="field-label" htmlFor="title">Title</label>
                <input id="title" className="field-input" {...register("title")} placeholder="Build a Next.js admin panel" />
                {errors.title ? <p className="status-error">{errors.title.message}</p> : null}
              </div>

              <div>
                <label className="field-label" htmlFor="description">Description</label>
                <textarea id="description" className="field-input" rows={4} {...register("description")} placeholder="Describe scope, timelines, and deliverables" />
                {errors.description ? <p className="status-error">{errors.description.message}</p> : null}
              </div>

              <div className="hirer-form-grid">
                <div>
                  <label className="field-label" htmlFor="budget">Budget</label>
                  <input id="budget" type="number" className="field-input" {...register("budget")} />
                  {errors.budget ? <p className="status-error">{errors.budget.message}</p> : null}
                </div>
                <div>
                  <label className="field-label" htmlFor="maxBudget">Max Budget (optional)</label>
                  <input id="maxBudget" type="number" className="field-input" {...register("maxBudget")} />
                  {errors.maxBudget ? <p className="status-error">{errors.maxBudget.message}</p> : null}
                </div>
              </div>

              <div className="hirer-form-grid">
                <div>
                  <label className="field-label" htmlFor="budgetType">Budget Type</label>
                  <select id="budgetType" className="field-input" {...register("budgetType")}>
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="projectType">Project Type</label>
                  <select id="projectType" className="field-input" {...register("projectType")}>
                    <option value="one_time">One Time</option>
                    <option value="ongoing">Ongoing</option>
                  </select>
                </div>
              </div>

              <div className="hirer-form-grid">
                <div>
                  <label className="field-label" htmlFor="categoryId">Category</label>
                  <select id="categoryId" className="field-input" {...register("categoryId")}>
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>{category.name}</option>
                    ))}
                  </select>
                  {errors.categoryId ? <p className="status-error">{errors.categoryId.message}</p> : null}
                </div>

                <div>
                  <label className="field-label" htmlFor="subCategoryId">Sub-category</label>
                  <select id="subCategoryId" className="field-input" {...register("subCategoryId")}>
                    <option value="">Select sub-category</option>
                    {subCategories.map((subCategory) => (
                      <option key={subCategory._id} value={subCategory._id}>{subCategory.name}</option>
                    ))}
                  </select>
                  {errors.subCategoryId ? <p className="status-error">{errors.subCategoryId.message}</p> : null}
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="experienceLevel">Experience Level</label>
                <select id="experienceLevel" className="field-input" {...register("experienceLevel")}>
                  <option value="entry">Entry</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="field-label" htmlFor="requiredSkills">Required Skills (comma separated)</label>
                <input
                  id="requiredSkills"
                  className="field-input"
                  {...register("requiredSkills")}
                  placeholder="React, Next.js, TypeScript"
                />
              </div>

              {formError ? <p className="status-error">{formError}</p> : null}
              {formStatus ? <p className="hirer-success">{formStatus}</p> : null}

              <div className="hirer-modal-actions">
                <button className="btn btn-primary" type="submit" disabled={isCreatingTask}>
                  {isCreatingTask ? "Posting..." : "Post Job"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPostJobOpen(false)}>
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
