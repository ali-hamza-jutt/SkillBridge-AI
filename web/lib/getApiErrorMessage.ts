export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;

  const err = error as {
    data?: { message?: string | string[] };
    error?: string;
  };

  const message = err.data?.message;

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  if (typeof message === "string") {
    return message;
  }

  if (typeof err.error === "string") {
    return err.error;
  }

  return fallback;
}
