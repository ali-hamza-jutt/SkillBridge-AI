import pica from "pica";

export async function createThumbnailFile(
  file: File,
  maxWidth = 800,
  quality = 0.8,
): Promise<File | null> {
  if (!file.type.startsWith("image/")) {
    return null;
  }

  const imageUrl = URL.createObjectURL(file);
  const image = new Image();
  image.src = imageUrl;

  try {
    await image.decode();

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = image.naturalWidth;
    sourceCanvas.height = image.naturalHeight;

    const sourceContext = sourceCanvas.getContext("2d");
    sourceContext?.drawImage(image, 0, 0);

    const scale = Math.min(1, maxWidth / image.naturalWidth);
    const targetCanvas = document.createElement("canvas");
    targetCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    targetCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const picaInstance = pica();
    await picaInstance.resize(sourceCanvas, targetCanvas, { quality: 3 });

    const blob = await picaInstance.toBlob(targetCanvas, "image/jpeg", quality);
    return new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
