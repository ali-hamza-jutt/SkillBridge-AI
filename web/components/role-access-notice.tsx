import Link from "next/link";

type RoleAccessNoticeProps = {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
};

export default function RoleAccessNotice({
  title,
  description,
  backHref = "/dashboard",
  backLabel = "Back to Dashboard",
}: RoleAccessNoticeProps) {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] py-10">
      <div className="mx-auto w-[min(100%-2rem,980px)]">
        <section className="rounded-3xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] p-6 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.35)]">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-main)]">{title}</h1>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">{description}</p>
          <Link
            href={backHref}
            className="mt-6 inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white no-underline"
          >
            {backLabel}
          </Link>
        </section>
      </div>
    </main>
  );
}