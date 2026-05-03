"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Camera, Loader2, Star } from "lucide-react";
import { useGcsControllerGenerateSignedUrlMutation } from "@/lib/api";
import AvatarCropModal from "@/components/avatar-crop-modal";
import type { UserProfile } from "@/lib/types/profile";

const AVATAR_COLORS = [
  "#4f8ef7","#7c6ef7","#36b37e","#f97316","#e11d48","#0891b2","#8b5cf6","#059669",
];
function avatarBg(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

type Props = {
  profile: UserProfile;
  categoryName?: string;
  onAvatarChange: (url: string) => void;
};

export default function ProfileHeader({ profile, categoryName, onAvatarChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generateSignedUrl] = useGcsControllerGenerateSignedUrlMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropApply = async (blob: Blob) => {
    setUploading(true);
    try {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const { signedUrl, publicUrl } = (await generateSignedUrl({
        generateUploadUrlDto: { fileName: file.name, mimeType: file.type, folder: "avatars" },
      }).unwrap()) as { signedUrl: string; publicUrl: string; objectName: string };

      await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      onAvatarChange(publicUrl);
    } finally {
      setUploading(false);
    }
  };

  const bg = avatarBg(profile.name);

  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-(--color-surface) p-6">
      <div className="flex flex-wrap items-start gap-5">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-3xl font-bold text-white"
            style={{ backgroundColor: profile.avatarUrl ? "transparent" : bg }}
          >
            {profile.avatarUrl ? (
              <Image src={profile.avatarUrl} alt={profile.name} width={96} height={96} className="h-24 w-24 object-cover rounded-full" unoptimized />
            ) : (
              initials(profile.name)
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-(--color-surface) bg-(--color-brand) text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
            aria-label="Change avatar"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-(--color-text-main)">{profile.name}</h1>
          {profile.title && (
            <p className="mt-0.5 text-base text-(--color-text-muted)">{profile.title}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-(--color-text-muted)">
            {categoryName && (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--color-brand-soft)_70%,var(--color-surface))] px-3 py-1 text-xs font-semibold text-(--color-brand-strong)">
                {categoryName}
              </span>
            )}
            {(profile.rating ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-(--color-text-main)">{profile.rating?.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Rate */}
        {profile.hourlyRate != null && profile.hourlyRate > 0 && (
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-(--color-text-main)">${profile.hourlyRate}</p>
            <p className="text-xs text-(--color-text-muted)">/ hour</p>
          </div>
        )}
      </div>

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onApply={handleCropApply}
          onClose={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
