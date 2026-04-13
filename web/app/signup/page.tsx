"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
  const [role, setRole] = useState<"FREELANCER" | "HIRER">("FREELANCER");
  const [status, setStatus] = useState<string | null>(null);

  const [signup, { isLoading: isSigningUp }] = useAuthControllerSignupMutation();
  const [login, { isLoading: isLoggingIn }] = useAuthControllerLoginMutation();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const skills = skillsText
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    try {
      await signup({
        signupDto: {
          name,
          email,
          password,
          role,
          ...(role === "FREELANCER" ? { skills } : {}),
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
        user?: { email?: string };
      };

      const userEmail = loginResponse.user?.email ?? email;

      dispatch(
        setCredentials({
          token: loginResponse.access_token,
          refreshToken: loginResponse.refresh_token,
          email: userEmail,
        }),
      );

      localStorage.setItem("auth_token", loginResponse.access_token);
      localStorage.setItem("auth_refresh_token", loginResponse.refresh_token);
      localStorage.setItem("auth_email", userEmail);

      router.push("/dashboard");
    } catch (error) {
      setStatus(getApiErrorMessage(error, "Signup failed. Please verify your details and try again."));
    }
  };

  return (
    <main className="app-root py-8">
      <div className="site-shell">
        <nav className="site-nav">
          <Link href="/" className="site-brand">Skill Bridge</Link>
          <Link href="/login" className="btn btn-secondary">Already have an account?</Link>
        </nav>

        <section className="surface-card form-shell">
          <div className="auth-grid">
            <aside className="auth-info">
              <p className="section-kicker">Get Started</p>
              <h1 className="section-title mt-2">Create Your Account</h1>
              <p className="muted-copy mt-3">Join the platform and start finding opportunities that match your skills.</p>

              <ul className="auth-list">
                <li>Build your identity and showcase your expertise.</li>
                <li>Apply on tasks and compete through clear bidding flows.</li>
                <li>Receive updates when clients assign work in realtime.</li>
              </ul>
            </aside>

            <div className="auth-form">
              <h2 className="section-title">Sign Up</h2>
              <p className="muted-copy mt-2">Create your profile in less than a minute.</p>

              <form className="field-stack mt-6" onSubmit={onSubmit}>
                <div>
                  <label className="field-label" htmlFor="name">Name</label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="field-input"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field-input"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    minLength={6}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field-input"
                    placeholder="minimum 6 characters"
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="role">Account Type</label>
                  <select
                    id="role"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value as "FREELANCER" | "HIRER")}
                    className="field-input"
                  >
                    <option value="FREELANCER">Freelancer</option>
                    <option value="HIRER">Job Giver</option>
                  </select>
                </div>

                <div>
                  <label className="field-label" htmlFor="skills">Skills (comma separated)</label>
                  <input
                    id="skills"
                    type="text"
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    className="field-input"
                    disabled={role !== "FREELANCER"}
                    placeholder="Node.js, Redis, NestJS"
                  />
                  {role !== "FREELANCER" ? (
                    <p className="muted-copy mt-2">Skills are optional for job giver accounts.</p>
                  ) : null}
                </div>

                {status ? <p className="status-error">{status}</p> : null}

                <button
                  className="btn btn-primary w-full"
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
