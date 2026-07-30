export default function ChatMessageTimestamp({
  value,
  className,
  format = "full",
}: {
  value: string | null;
  className?: string;
  format?: "full" | "list" | "time";
}) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const timeLabel = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  let label = timeLabel;

  if (format === "full") {
    label = date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } else if (format === "list") {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const daysAgo = Math.round(
      (startOfToday.getTime() - startOfMessageDay.getTime()) / 86_400_000,
    );

    if (daysAgo === 0) label = timeLabel;
    else if (daysAgo === 1) label = "Yesterday";
    else if (daysAgo > 1 && daysAgo < 7) {
      label = date.toLocaleDateString([], { weekday: "short" });
    } else {
      label = date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }

  return (
    <time
      dateTime={date.toISOString()}
      className={`text-[11px] ${className ?? "text-(--color-text-muted)"}`}
    >
      {label}
    </time>
  );
}
