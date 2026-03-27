import Link from "next/link";

export default function Home() {
  return (
    <main className="app-root">
      <div className="site-shell">
        <nav className="site-nav">
          <span className="site-brand">Skill Bridge</span>
          <div className="flex gap-3">
            <Link href="/login" className="btn btn-secondary">Log In</Link>
            <Link href="/signup" className="btn btn-primary">Sign Up</Link>
          </div>
        </nav>

        <section className="surface-card hero-panel mt-4">
          <p className="muted-copy text-sm">Find clients. Win bids. Deliver work.</p>
          <h1 className="hero-title mt-3">One place to connect talent and opportunities.</h1>
          <p className="muted-copy mt-4 max-w-[62ch]">
            Build your profile, discover tasks, and collaborate with clients in a focused workflow.
            Start by creating your account, then move into your dashboard.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary">Create Account</Link>
            <Link href="/login" className="btn btn-secondary">I Already Have an Account</Link>
          </div>
        </section>

        <section className="mt-6 grid-3 pb-10">
          <article className="surface-card p-5">
            <h2 className="section-title">Fast Onboarding</h2>
            <p className="muted-copy mt-2">Create account and move directly into your workspace.</p>
          </article>
          <article className="surface-card p-5">
            <h2 className="section-title">Unified Workflow</h2>
            <p className="muted-copy mt-2">Manage profile, tasks, bids, and activity from one dashboard.</p>
          </article>
          <article className="surface-card p-5">
            <h2 className="section-title">Scalable Foundation</h2>
            <p className="muted-copy mt-2">State management and API integration are built with RTK Query.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
