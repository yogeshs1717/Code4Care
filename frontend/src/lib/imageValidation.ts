/** Client-side pre-checks. The backend re-validates by magic bytes; this only
 *  saves the user a round trip. */

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
    const label = file.type || 'unknown';
    return `${label} images are not supported. Use JPEG, PNG, WEBP or BMP.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (MAX_IMAGE_BYTES / (1024 * 1024)).toFixed(0);
    return `Image is too large (max ${mb} MB).`;
  }
  if (file.size === 0) {
    return 'The selected file is empty.';
  }
  return null;
}
