"use client";

import { useState } from "react";
import SectionCard, { FormField, Input, Textarea } from "./section-card";
import type { UserProfile } from "@/lib/types/profile";

type Props = {
  profile: UserProfile;
  onSave: (data: { title?: string; bio?: string; hourlyRate?: number }) => Promise<void>;
};

export default function AboutSection({ profile, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(profile.title ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [hourlyRate, setHourlyRate] = useState(String(profile.hourlyRate ?? ""));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title: title.trim() || undefined,
        bio: bio.trim() || undefined,
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(profile.title ?? "");
    setBio(profile.bio ?? "");
    setHourlyRate(String(profile.hourlyRate ?? ""));
    setEditing(false);
  };

  return (
    <SectionCard
      title="About"
      editing={editing}
      saving={saving}
      onEdit={() => setEditing(true)}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      {editing ? (
        <div className="grid gap-4">
          <FormField label="Professional Headline">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Full Stack Developer | React & Node.js"
              maxLength={120}
            />
          </FormField>
          <FormField label="Hourly Rate (USD)">
            <Input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="e.g. 50"
              min={0}
              max={9999}
            />
          </FormField>
          <FormField label="Bio / Introduction">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell clients about yourself, your experience, and what makes you great to work with..."
              rows={6}
              maxLength={2000}
            />
            <p className="mt-1 text-right text-xs text-(--color-text-muted)">{bio.length}/2000</p>
          </FormField>
        </div>
      ) : (
        <div>
          {profile.bio ? (
            <p className="whitespace-pre-wrap text-sm leading-7 text-(--color-text-main)">{profile.bio}</p>
          ) : (
            <p className="text-sm italic text-(--color-text-muted)">No bio added yet. Click the pencil to add one.</p>
          )}
        </div>
      )}
    </SectionCard>
  );
}
