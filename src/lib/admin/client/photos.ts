import { chooseUpload, fitWithin, MAX_PHOTO_SIDE } from '@/lib/products/format';
export const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
export const isPhotoType = (type: string): type is keyof typeof PHOTO_TYPES => Object.hasOwn(PHOTO_TYPES, type);
export async function preparePhoto(file: File): Promise<Blob | null> {
  let bitmap: ImageBitmap | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let optimized: Blob | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const size = fitWithin(bitmap.width, bitmap.height, MAX_PHOTO_SIDE);
    canvas = document.createElement('canvas');
    canvas.width = size.width; canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw Error('Canvas unavailable');
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    optimized = await new Promise<Blob | null>((resolve) => canvas!.toBlob(resolve, 'image/webp', 0.82));
  } catch { /* Keep the original only if it meets the upload limits. */ }
  finally { bitmap?.close(); if (canvas) { canvas.width = 0; canvas.height = 0; } }
  const upload = chooseUpload(file, optimized) === 'optimized' ? optimized! : file;
  return isPhotoType(upload.type) && upload.size > 0 && upload.size <= MAX_PHOTO_BYTES ? upload : null;
}

