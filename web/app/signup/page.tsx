"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useLoginMutation, useSignupMutation } from "@/lib/features/auth/authApi";
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
  const [status, setStatus] = useState<string | null>(null);

  const [signup, { isLoading: isSigningUp }] = useSignupMutation();
  const [login, { isLoading: isLoggingIn }] = useLoginMutation();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const skills = skillsText
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    try {
      await signup({ name, email, password, skills }).unwrap();

      const loginResponse = await login({ email, password }).unwrap();
      const userEmail = loginResponse.user?.email ?? email;

      dispatch(
        setCredentials({
          token: loginResponse.access_token,
          email: userEmail,
        }),
      );

      localStorage.setItem("auth_token", loginResponse.access_token);
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
                  <label className="field-label" htmlFor="skills">Skills (comma separated)</label>
                  <input
                    id="skills"
                    type="text"
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    className="field-input"
                    placeholder="Node.js, Redis, NestJS"
                  />
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
