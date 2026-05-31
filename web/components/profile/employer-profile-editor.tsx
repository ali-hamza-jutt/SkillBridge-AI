"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import AvatarCropModal from "@/components/avatar-crop-modal";
import { useGcsControllerGenerateSignedUrlMutation } from "@/lib/api";
import type { UserProfile } from "@/lib/types/profile";
import SectionCard, { FormField, Input, Select } from "./section-card";

const TIMEZONE_OPTIONS =
  typeof Intl.supportedValuesOf === "function"
    ? ["UTC", ...Intl.supportedValuesOf("timeZone")]
    : [
        "UTC",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Phoenix",
        "America/Toronto",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Europe/Madrid",
        "Asia/Dubai",
        "Asia/Kolkata",
        "Asia/Singapore",
        "Asia/Tokyo",
        "Australia/Sydney",
      ];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type Props = {
  profile: UserProfile;
  onSave: (data: { name?: string; avatarUrl?: string; timezone?: string }) => Promise<void>;
};

export default function EmployerProfileEditor({ profile, onSave }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [name, setName] = useState(profile.name ?? "");
  const [timezone, setTimezone] = useState(profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl ?? null);
  const [generateSignedUrl] = useGcsControllerGenerateSignedUrlMutation();

  useEffect(() => {
    if (editing) {
      return;
    }

    setName(profile.name ?? "");
    setTimezone(profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    setAvatarUrl(profile.avatarUrl ?? null);
  }, [editing, profile.avatarUrl, profile.name, profile.timezone]);

  const displayAvatarUrl = avatarUrl ?? profile.avatarUrl ?? null;
  const timezoneLabel = profile.timezone ?? "Not set";

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropApply = async (blob: Blob) => {
    setUploading(true);
    try {
      const file = new File([blob], "profile-avatar.jpg", { type: "image/jpeg" });
      const uploadResponse = (await generateSignedUrl({
        generateUploadUrlDto: { fileName: file.name, mimeType: file.type, folder: "avatars" },
      }).unwrap()) as { signedUrl: string; publicUrl: string; objectName: string };

      await fetch(uploadResponse.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      await onSave({ avatarUrl: uploadResponse.publicUrl });
      setAvatarUrl(uploadResponse.publicUrl);
    } finally {
      setUploading(false);
      setCropSrc(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name: name.trim() || undefined,
        timezone: timezone.trim() || undefined,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(profile.name ?? "");
    setTimezone(profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    setAvatarUrl(profile.avatarUrl ?? null);
    setEditing(false);
  };

  return (
    <SectionCard title="Employer Profile" editing={editing} saving={saving} onEdit={() => setEditing(true)} onSave={handleSave} onCancel={handleCancel}>
      <div className="grid gap-5 md:grid-cols-[auto_1fr] md:items-start">
        <div className="relative shrink-0">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full text-3xl font-bold text-white" style={{ backgroundColor: displayAvatarUrl ? "transparent" : "var(--color-brand)" }}>
            {displayAvatarUrl ? (
              <Image src={displayAvatarUrl} alt={name || profile.name} width={112} height={112} className="h-28 w-28 rounded-full object-cover" unoptimized />
            ) : (
              initials(name || profile.name)
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-(--color-surface) bg-(--color-brand) text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
            aria-label="Change profile picture"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>

        <div className="grid gap-4">
          <div>
            <p className="text-sm font-semibold text-(--color-text-main)">{name || profile.name}</p>
            <p className="text-xs text-(--color-text-muted)">Profile picture updates immediately after upload.</p>
          </div>

          {editing ? (
            <div className="grid gap-4">
              <FormField label="Name" required>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Company name or contact name" maxLength={120} />
              </FormField>

              <FormField label="Timezone" required>
                <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                  {TIMEZONE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-(--color-text-muted)">Choose the employer’s IANA timezone from the full list.</p>
              </FormField>
            </div>
          ) : (
            <div className="grid gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-strong)_52%,transparent)] p-4 text-sm text-(--color-text-muted)">
              <p>
                <span className="font-semibold text-(--color-text-main)">Name:</span> {name || profile.name}
              </p>
              <p>
                <span className="font-semibold text-(--color-text-main)">Timezone:</span> {timezoneLabel}
              </p>
            </div>
          )}
        </div>
      </div>

      {cropSrc && <AvatarCropModal imageSrc={cropSrc} onApply={handleCropApply} onClose={() => setCropSrc(null)} />}
    </SectionCard>
  );
}