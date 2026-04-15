"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { logout } from "@/lib/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  useCategoryControllerGetAllCategoriesQuery,
  useCategoryControllerGetSubCategoriesQuery,
  useTasksControllerCreateMutation,
  useTasksControllerGetMyOpenTasksQuery,
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
  const { token, email, role } = useAppSelector((state) => state.auth);

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
    data: myOpenTasksRaw,
    isFetching: isLoadingMyTasks,
    refetch: refetchMyTasks,
  } = useTasksControllerGetMyOpenTasksQuery(undefined, {
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
  const myOpenTasks = (myOpenTasksRaw as Task[] | undefined) ?? [];

  const openTasksCount = useMemo(
    () => myOpenTasks.filter((task) => task.status === "OPEN").length,
    [myOpenTasks],
  );

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
    } catch (error) {
      window.alert(getApiErrorMessage(error, "Failed to create task. Please try again."));
    }
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
    <main className="app-root py-8">
      <div className="site-shell">
        <nav className="site-nav">
          <Link href="/" className="site-brand">Skill Bridge</Link>
          <button onClick={signOut} className="btn btn-secondary" type="button">Log Out</button>
        </nav>

        <section className="surface-card hero-panel mt-4">
          <h1 className="section-title">Hirer Dashboard</h1>
          <p className="muted-copy mt-2">Signed in as <strong>{email ?? "User"}</strong></p>

          <div className="dashboard-grid mt-7">
            <article className="metric-card">
              <p className="metric-label">My Open Jobs</p>
              <p className="metric-value">{openTasksCount}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Total Posted Tasks</p>
              <p className="metric-value">{myOpenTasks.length}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">Create Status</p>
              <p className="metric-value">{isCreatingTask ? "Saving" : "Ready"}</p>
            </article>
          </div>

          <section className="mt-8">
            <h2 className="section-title">Post New Task</h2>
            <p className="muted-copy mt-2">Create a new job and it will appear in your open jobs list.</p>

            <form className="field-stack mt-6" onSubmit={handleSubmit(onCreateTask)}>
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

              <div className="dashboard-grid">
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

              <div className="dashboard-grid">
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

              <div className="dashboard-grid">
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

              <button className="btn btn-primary" type="submit" disabled={isCreatingTask}>
                {isCreatingTask ? "Posting Task..." : "Post Task"}
              </button>
            </form>
          </section>

          <section className="mt-10">
            <h2 className="section-title">My Open Jobs</h2>
            {isLoadingMyTasks ? <p className="muted-copy mt-3">Loading your open jobs...</p> : null}
            {!isLoadingMyTasks && myOpenTasks.length === 0 ? (
              <p className="muted-copy mt-3">No open jobs posted yet.</p>
            ) : null}
            <div className="mt-5 grid-3">
              {myOpenTasks.map((task) => (
                <article key={task._id} className="feature-card">
                  <h3 className="feature-title">{task.title}</h3>
                  <p className="feature-text mt-2">{task.description}</p>
                  <p className="muted-copy mt-3">
                    Budget: {task.budgetType === "hourly" ? "$" : "$"}{task.budget}
                    {typeof task.maxBudget === "number" ? ` - $${task.maxBudget}` : ""}
                  </p>
                  <p className="muted-copy mt-2">Project: {task.projectType.replace("_", " ")}</p>
                  <p className="muted-copy mt-2">Level: {task.experienceLevel}</p>
                  {task.requiredSkills?.length ? (
                    <p className="muted-copy mt-2">Skills: {task.requiredSkills.join(", ")}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
