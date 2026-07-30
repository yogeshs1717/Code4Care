export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Extract `rect` (in natural image pixels) from `image` as a JPEG file. */
export async function cropImageToFile(
  image: HTMLImageElement,
  rect: CropRect,
  fileName = 'label.jpg',
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');

  ctx.drawImage(
    image,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.92),
  );
  if (!blob) throw new Error('Could not process the cropped image.');

  return new File([blob], fileName, { type: 'image/jpeg' });
}
