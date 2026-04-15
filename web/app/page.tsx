import Link from "next/link";

export default function Home() {
  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at 8% 7%, color-mix(in srgb, var(--color-brand) 10%, transparent), transparent 40%), radial-gradient(circle at 92% 14%, color-mix(in srgb, var(--color-accent) 9%, transparent), transparent 46%), linear-gradient(160deg, var(--color-bg), color-mix(in srgb, var(--color-surface-strong) 74%, var(--color-bg)))",
      }}
    >
      <header className="sticky top-0 z-20 border-b border-[color-mix(in_srgb,var(--color-border)_88%,transparent)] bg-[color-mix(in_srgb,var(--color-bg)_86%,transparent)] backdrop-blur-xl">
        <div className="mx-auto grid w-[min(100%-2rem,1180px)] grid-cols-[auto_1fr_auto] items-center gap-4 py-3 max-[640px]:grid-cols-1">
          <Link href="/" className="relative pl-4 text-lg font-bold text-[var(--color-text-main)] no-underline before:absolute before:left-0 before:top-1 before:h-3 before:w-3 before:rounded-full before:bg-[linear-gradient(145deg,var(--color-brand),var(--color-accent))]">
            SkillBridge
          </Link>

          <nav className="flex flex-wrap justify-center gap-3 max-[640px]:justify-start" aria-label="Primary Navigation">
            <Link href="#" className="rounded-full px-2 py-1 text-sm font-semibold text-[var(--color-text-main)] no-underline transition hover:bg-[color-mix(in_srgb,var(--color-brand-soft)_70%,var(--color-surface))] hover:text-[var(--color-brand-strong)]">Hire Freelancers</Link>
            <Link href="#" className="rounded-full px-2 py-1 text-sm font-semibold text-[var(--color-text-main)] no-underline transition hover:bg-[color-mix(in_srgb,var(--color-brand-soft)_70%,var(--color-surface))] hover:text-[var(--color-brand-strong)]">Find Work</Link>
            <Link href="#" className="rounded-full px-2 py-1 text-sm font-semibold text-[var(--color-text-main)] no-underline transition hover:bg-[color-mix(in_srgb,var(--color-brand-soft)_70%,var(--color-surface))] hover:text-[var(--color-brand-strong)]">Why SkillBridge</Link>
            <Link href="/login" className="rounded-full px-2 py-1 text-sm font-semibold text-[var(--color-text-main)] no-underline transition hover:bg-[color-mix(in_srgb,var(--color-brand-soft)_70%,var(--color-surface))] hover:text-[var(--color-brand-strong)]">Login</Link>
          </nav>

          <Link href="/signup" className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-[0_14px_24px_-18px_color-mix(in_srgb,var(--color-brand)_62%,transparent)] transition hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-brand-strong)_92%,#0d7000),var(--color-brand))]">
            Post a Job
          </Link>
        </div>
      </header>

      <div className="mx-auto grid w-[min(100%-2rem,1180px)] gap-6 pb-8 pt-3">
        <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_92%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-6 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.3)] backdrop-blur-md md:p-10 md:py-12" style={{ animation: "riseIn 420ms ease forwards" }}>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-wider text-[color-mix(in_srgb,var(--color-brand-strong)_90%,var(--color-text-main))]">Find Top Talent In Minutes</p>
              <h1 className="mt-3 text-4xl font-bold leading-tight md:text-6xl" style={{ letterSpacing: "-0.03em" }}>Where great freelancers and bold projects meet.</h1>
              <p className="mt-4 text-lg text-[var(--color-text-muted)]">
                SkillBridge helps companies hire skilled professionals faster and empowers freelancers
                to discover high-quality opportunities across top domains.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/signup" className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-[0_14px_24px_-18px_color-mix(in_srgb,var(--color-brand)_62%,transparent)] transition hover:bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-brand-strong)_92%,#0d7000),var(--color-brand))]">I Need Freelancer</Link>
                <Link href="/signup" className="inline-flex items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,var(--color-brand-soft))] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-main)] no-underline transition hover:bg-[color-mix(in_srgb,var(--color-surface)_72%,var(--color-brand-soft))]">I Need Work</Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-brand-soft)_44%,var(--color-surface))] px-2.5 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--color-brand-strong)_82%,var(--color-text-main))]">Verified Profiles</span>
                <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-brand-soft)_44%,var(--color-surface))] px-2.5 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--color-brand-strong)_82%,var(--color-text-main))]">Real-Time Updates</span>
                <span className="rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-brand-soft)_44%,var(--color-surface))] px-2.5 py-1 text-xs font-semibold text-[color-mix(in_srgb,var(--color-brand-strong)_82%,var(--color-text-main))]">Secure Payments Ready</span>
              </div>
            </div>

            <div className="relative min-h-[320px] overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_82%,transparent)]" style={{ background: "radial-gradient(circle at 22% 12%, color-mix(in srgb, var(--color-brand-soft) 88%, transparent), transparent 58%), radial-gradient(circle at 84% 80%, color-mix(in srgb, var(--color-accent-soft) 86%, transparent), transparent 54%), linear-gradient(165deg, color-mix(in srgb, var(--color-surface) 72%, var(--color-surface-tint)), var(--color-surface))" }} aria-hidden="true">
              <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full" style={{ background: "linear-gradient(150deg, color-mix(in srgb, var(--color-brand) 35%, transparent), color-mix(in srgb, var(--color-accent) 25%, transparent))", animation: "floatOrb 6s ease-in-out infinite" }} />

              <div className="absolute bottom-4 left-4 w-[250px] max-w-[85%] rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_78%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] p-3 shadow-[0_22px_44px_-34px_rgba(15,23,42,0.34)]" style={{ animation: "floatCard 4.8s ease-in-out infinite" }}>
                <p className="m-0 text-xs text-[var(--color-text-muted)]">React, Next.js, TypeScript</p>
                <p className="m-0 mt-1 text-sm font-bold">Frontend Developer</p>
                <p className="m-0 mt-2 font-bold">$35/hr</p>
              </div>

              <div className="absolute right-4 top-4 w-[185px] rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_78%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] p-3 shadow-[0_22px_44px_-34px_rgba(15,23,42,0.34)]" style={{ animation: "floatCard 5.4s ease-in-out infinite" }}>
                <p className="m-0 text-xs text-[var(--color-text-muted)]">Bid Received</p>
                <p className="m-0 mt-1 text-sm font-bold">+12 New Proposals</p>
              </div>

              <div className="absolute bottom-4 right-4 w-[170px] rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_78%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] p-3 shadow-[0_22px_44px_-34px_rgba(15,23,42,0.34)]" style={{ animation: "floatCard 5.8s ease-in-out infinite" }}>
                <p className="m-0 text-xs text-[var(--color-text-muted)]">Task Status</p>
                <p className="m-0 mt-1 text-sm font-bold">Assigned in 2h</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
