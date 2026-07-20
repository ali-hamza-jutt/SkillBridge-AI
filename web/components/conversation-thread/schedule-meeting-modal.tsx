"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  useMeetingsControllerCheckConflictsQuery,
  useMeetingsControllerScheduleMutation,
} from "@/lib/api";
import type { Meeting, MeetingConflict } from "@/lib/types/chat";
import { CONFLICT_CHECK_DEBOUNCE_MS, MEETING_DURATION_OPTIONS_MINUTES } from "@/lib/constants/common";

type Props = {
  open: boolean;
  conversationId: string;
  onClose: () => void;
  onScheduled: (meeting: Meeting) => void;
};

function toLocalDateTimeInputMin() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default function ScheduleMeetingModal({ open, conversationId, onClose, onScheduled }: Props) {
  const [dateTimeLocal, setDateTimeLocal] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [topic, setTopic] = useState("");
  const [debouncedDateTime, setDebouncedDateTime] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setDateTimeLocal("");
    setDurationMinutes(30);
    setTopic("");
    setDebouncedDateTime("");
    setSubmitError(null);
  }, [open, conversationId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDateTime(dateTimeLocal), CONFLICT_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [dateTimeLocal]);

  const startTimeUtc = useMemo(
    () => (debouncedDateTime ? new Date(debouncedDateTime).toISOString() : null),
    [debouncedDateTime],
  );

  const { data: conflictData, isFetching: checkingConflict } = useMeetingsControllerCheckConflictsQuery(
    startTimeUtc
      ? { conversationId, startTimeUtc, durationMinutes: String(durationMinutes) }
      : { conversationId, startTimeUtc: "", durationMinutes: String(durationMinutes) },
    { skip: !startTimeUtc },
  );

  const conflictResult = conflictData as MeetingConflict | undefined;
  const conflict = conflictResult?.conflict === true ? conflictResult : null;

  const [scheduleMeeting, { isLoading: scheduling }] = useMeetingsControllerScheduleMutation();

  const canSubmit = Boolean(dateTimeLocal) && !checkingConflict && !conflict && !scheduling;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setSubmitError(null);
      const result = await scheduleMeeting({
        scheduleMeetingDto: {
          conversationId,
          startTimeUtc: new Date(dateTimeLocal).toISOString(),
          durationMinutes,
          timezone,
          ...(topic.trim() ? { topic: topic.trim() } : {}),
        },
      }).unwrap();
      onScheduled(result as unknown as Meeting);
      onClose();
    } catch {
      setSubmitError("Failed to schedule meeting. Please try again.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl bg-(--color-surface) p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-(--color-text-muted) hover:bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-base font-bold text-(--color-text-main)">Schedule a Zoom meeting</h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-(--color-text-main)">Date &amp; time</span>
            <input
              type="datetime-local"
              required
              min={toLocalDateTimeInputMin()}
              value={dateTimeLocal}
              onChange={(e) => setDateTimeLocal(e.target.value)}
              className="rounded-lg border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface-strong)_50%,transparent)] px-3 py-2 text-sm text-(--color-text-main) outline-none focus:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))]"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-(--color-text-main)">Duration</span>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="rounded-lg border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface-strong)_50%,transparent)] px-3 py-2 text-sm text-(--color-text-main) outline-none focus:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))]"
            >
              {MEETING_DURATION_OPTIONS_MINUTES.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} minutes
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-(--color-text-main)">Topic (optional)</span>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Project kickoff call"
              className="rounded-lg border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface-strong)_50%,transparent)] px-3 py-2 text-sm text-(--color-text-main) outline-none placeholder:text-(--color-text-muted) focus:border-[color-mix(in_srgb,var(--color-brand)_40%,var(--color-border))]"
            />
          </label>

          {checkingConflict && (
            <p className="flex items-center gap-1.5 text-xs text-(--color-text-muted)">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking availability...
            </p>
          )}

          {conflict && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              This slot overlaps another meeting already booked between{" "}
              {new Date(conflict.startTimeUtc).toLocaleString()} and{" "}
              {new Date(conflict.endTimeUtc).toLocaleString()}. Please pick a different time.
            </p>
          )}

          {submitError && <p className="text-xs text-red-500">{submitError}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
          >
            {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Schedule meeting
          </button>
        </form>
      </div>
    </div>
  );
}
