"use client";

export async function fileToResizedImageDataUrl(
  file: File,
  options: { maxSize?: number; quality?: number } = {}
): Promise<string> {
  const maxSize = options.maxSize ?? 512;
  const quality = options.quality ?? 0.82;

  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 등록할 수 있습니다.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("8MB 이하 이미지만 등록할 수 있습니다.");
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
      img.src = sourceUrl;
    });

    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 처리하지 못했습니다.");

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
