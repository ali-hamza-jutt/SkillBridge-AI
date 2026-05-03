"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut, Loader2 } from "lucide-react";

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height,
  );

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas is empty")), "image/jpeg", 0.92),
  );
}

type Props = {
  imageSrc: string;
  onApply: (blob: Blob) => Promise<void>;
  onClose: () => void;
};

export default function AvatarCropModal({ imageSrc, onApply, onClose }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setApplying(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      await onApply(blob);
      onClose();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-(--color-surface) shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-border)">
          <h2 className="text-sm font-bold text-(--color-text-main)">Crop Profile Photo</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Crop area */}
        <div className="relative h-72 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-(--color-border)">
          <ZoomOut className="h-4 w-4 shrink-0 text-(--color-text-muted)" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-[color-mix(in_srgb,var(--color-brand-soft)_80%,var(--color-border))] accent-(--color-brand)"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-(--color-text-muted)" />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-(--color-border) px-5 py-2.5 text-sm font-semibold text-(--color-text-muted) hover:bg-[color-mix(in_srgb,var(--color-border)_30%,transparent)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className="flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-strong))] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {applying && <Loader2 className="h-4 w-4 animate-spin" />}
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
