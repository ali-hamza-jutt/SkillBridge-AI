export default function ChatMessageTimestamp({
  value,
  className,
}: {
  value: string | null;
  className?: string;
}) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return (
    <time
      dateTime={date.toISOString()}
      className={`text-[11px] ${className ?? "text-(--color-text-muted)"}`}
    >
      {date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}
    </time>
  );
}
