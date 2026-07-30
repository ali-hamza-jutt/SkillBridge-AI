import AppLoader from "@/components/app-loader";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-(--color-bg)">
      <AppLoader label="Loading your workspace..." />
    </main>
  );
}
