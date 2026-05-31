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

    const targetContext = targetCanvas.getContext("2d");
    if (!targetContext) {
      return null;
    }

    targetContext.imageSmoothingEnabled = true;
    targetContext.imageSmoothingQuality = "high";
    targetContext.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      targetCanvas.toBlob((result) => resolve(result), "image/jpeg", quality);
    });
    if (!blob) {
      return null;
    }

    const thumbnailFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" });
    return thumbnailFile;
  } catch (error) {
    return null;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
