export async function createThumbnailFile(
  file: File,
  maxWidth = 800,
  quality = 0.8,
  signal?: AbortSignal,
): Promise<File | null> {
  if (!file.type.startsWith("image/")) {
    return null;
  }

  const imageUrl = URL.createObjectURL(file);
  const image = new Image();
  image.src = imageUrl;
  const abortDecode = () => {
    image.src = "";
  };
  signal?.addEventListener("abort", abortDecode, { once: true });

  try {
    signal?.throwIfAborted();
    await image.decode();
    signal?.throwIfAborted();

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
    targetContext.drawImage(
      image,
      0,
      0,
      targetCanvas.width,
      targetCanvas.height,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      targetCanvas.toBlob((result) => resolve(result), "image/jpeg", quality);
    });
    if (!blob) {
      return null;
    }

    signal?.throwIfAborted();
    return new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
      type: "image/jpeg",
    });
  } catch {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException("Upload cancelled", "AbortError");
    }
    return null;
  } finally {
    signal?.removeEventListener("abort", abortDecode);
    URL.revokeObjectURL(imageUrl);
  }
}
