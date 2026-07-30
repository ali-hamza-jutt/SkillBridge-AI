import { Loader2 } from "lucide-react";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SPINNER_SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-9 w-9",
} as const;

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <Loader2
      aria-hidden="true"
      className={`${SPINNER_SIZES[size]} animate-spin text-(--color-brand) ${className ?? ""}`}
    />
  );
}

export default function AppLoader({
  label = "Loading...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-48 flex-col items-center justify-center gap-3 ${className ?? ""}`}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="lg" />
      <span className="text-sm font-medium text-(--color-text-secondary)">{label}</span>
    </div>
  );
}
