"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCategoryControllerGetAllCategoriesQuery,
  useAuthControllerLoginMutation,
  useAuthControllerSignupMutation,
} from "@/lib/api";
import { setCredentials } from "@/lib/features/auth/authSlice";
import { useAppDispatch } from "@/lib/hooks";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

export default function SignupPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [role, setRole] = useState<"FREELANCER" | "HIRER">("FREELANCER");
  const [status, setStatus] = useState<string | null>(null);

  const { data: categoriesRaw = [] } = useCategoryControllerGetAllCategoriesQuery();

  const [signup, { isLoading: isSigningUp }] = useAuthControllerSignupMutation();
  const [login, { isLoading: isLoggingIn }] = useAuthControllerLoginMutation();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const skills = skillsText
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    if (role === "FREELANCER" && !categoryId) {
      setStatus("Please select a category for your freelancer profile.");
      return;
    }

    try {
      await signup({
        signupDto: {
          name,
          email,
          password,
          role,
          ...(role === "FREELANCER" ? { skills, categoryId } : {}),
        },
      }).unwrap();

      const rawLoginResponse = await login({
        loginDto: {
          email,
          password,
        },
      }).unwrap();

      const loginResponse = rawLoginResponse as {
        access_token: string;
        refresh_token: string;
        user?: {
          id?: string;
          email?: string;
          role?: "FREELANCER" | "HIRER" | "ADMIN";
          categoryId?: string | null;
          skills?: string[];
        };
      };

      const userEmail = loginResponse.user?.email ?? email;
      const userId = loginResponse.user?.id ?? null;
      const roleValue = loginResponse.user?.role ?? role;
      const userCategoryId = loginResponse.user?.categoryId ?? (role === "FREELANCER" ? categoryId : null);
      const userSkills = loginResponse.user?.skills ?? skills;

      dispatch(
        setCredentials({
          userId,
          role: roleValue,
          categoryId: userCategoryId,
          skills: userSkills,
          token: loginResponse.access_token,
          refreshToken: loginResponse.refresh_token,
          email: userEmail,
        }),
      );

      localStorage.setItem("auth_token", loginResponse.access_token);
      localStorage.setItem("auth_refresh_token", loginResponse.refresh_token);
      localStorage.setItem("auth_email", userEmail);
      if (userId) {
        localStorage.setItem("auth_user_id", userId);
      }
      if (roleValue) {
        localStorage.setItem("auth_role", roleValue);
      }
      if (userCategoryId) {
        localStorage.setItem("auth_category_id", userCategoryId);
      }
      localStorage.setItem("auth_skills", JSON.stringify(userSkills));

      router.push("/dashboard");
    } catch (error) {
      setStatus(getApiErrorMessage(error, "Signup failed. Please verify your details and try again."));
    }
  };

  const inputClassName =
    "mt-1 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-main)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--color-text-muted)_86%,transparent)] focus:border-[color-mix(in_srgb,var(--color-brand)_58%,var(--color-border))] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand-soft)_75%,transparent)]";

  return (
    <main
      className="min-h-screen py-8"
      style={{
        background:
          "radial-gradient(circle at 88% 2%, color-mix(in srgb, var(--color-accent-soft) 55%, transparent), transparent 36%), linear-gradient(168deg, var(--color-bg), color-mix(in srgb, var(--color-surface-strong) 84%, var(--color-bg)))",
      }}
    >
      <div className="mx-auto grid w-[min(100%-2rem,1080px)] gap-5">
        <nav className="flex items-center justify-between gap-3 py-2">
          <Link href="/" className="text-lg font-bold tracking-tight text-[var(--color-text-main)] no-underline">
            Skill Bridge
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-brand-soft))] px-4 py-2 text-sm font-semibold text-[var(--color-text-main)] no-underline transition hover:bg-[color-mix(in_srgb,var(--color-surface)_75%,var(--color-brand-soft))]"
          >
            Already have an account?
          </Link>
        </nav>

        <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)] backdrop-blur-md md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.02fr_0.98fr] md:items-start">
            <aside className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-soft)_46%,var(--color-surface))] p-5">
              <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--color-brand-strong)_90%,var(--color-text-main))]">
                Get Started
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-main)]">Create Your Account</h1>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                Join the platform and start finding opportunities that match your skills.
              </p>

              <ul className="mt-5 grid gap-2.5 pl-5 text-sm text-[var(--color-text-main)] marker:text-[var(--color-brand)]">
                <li>Build your identity and showcase your expertise.</li>
                <li>Apply on tasks and compete through clear bidding flows.</li>
                <li>Receive updates when clients assign work in realtime.</li>
              </ul>
            </aside>

            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_82%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_95%,transparent)] p-5 md:p-6">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">Sign Up</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">Create your profile in less than a minute.</p>

              <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]" htmlFor="name">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClassName}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClassName}
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    minLength={6}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClassName}
                    placeholder="minimum 6 characters"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]" htmlFor="role">
                    Account Type
                  </label>
                  <select
                    id="role"
                    required
                    value={role}
                    onChange={(e) => {
                      const nextRole = e.target.value as "FREELANCER" | "HIRER";
                      setRole(nextRole);
                      if (nextRole !== "FREELANCER") {
                        setCategoryId("");
                      }
                    }}
                    className={inputClassName}
                  >
                    <option value="FREELANCER">Freelancer</option>
                    <option value="HIRER">Job Giver</option>
                  </select>
                </div>

                {role === "FREELANCER" ? (
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]" htmlFor="categoryId">
                      Freelancer Category
                    </label>
                    <select
                      id="categoryId"
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select a category</option>
                      {(categoriesRaw as Array<{ _id: string; name: string }>).map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]" htmlFor="skills">
                    Skills (comma separated)
                  </label>
                  <input
                    id="skills"
                    type="text"
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    className={inputClassName}
                    disabled={role !== "FREELANCER"}
                    placeholder="Node.js, Redis, NestJS"
                  />
                  {role !== "FREELANCER" ? (
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">Skills are optional for job giver accounts.</p>
                  ) : null}
                </div>

                {status ? (
                  <p className="rounded-xl border border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-danger-soft)_80%,var(--color-surface))] px-3 py-2 text-sm text-[var(--color-danger)]">
                    {status}
                  </p>
                ) : null}

                <button
                  className="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-brand-strong)_92%,#0d7000),var(--color-brand))] disabled:cursor-not-allowed disabled:opacity-70"
                  type="submit"
                  disabled={isSigningUp || isLoggingIn}
                >
                  {isSigningUp || isLoggingIn ? "Creating Account..." : "Sign Up"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
