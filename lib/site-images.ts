/**
 * Photos the owner manages from the admin panel (Our Work gallery and one
 * photo per service), stored in the public `site-images` bucket.
 *
 * Anything she hasn't uploaded yet falls back to the photos bundled in
 * /public, so the site never shows an empty slot or a broken image.
 */

export const SITE_IMAGES_BUCKET = 'site-images';

export function publicImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SITE_IMAGES_BUCKET}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

const BUNDLED_SERVICE_PHOTOS: Record<string, string> = {
  'gel-manicure': '/gallery/work-4.jpg',
  'hard-gel-overlay': '/gallery/work-6.jpg',
  'hard-gel-new-set': '/gallery/work-8.jpg',
  'false-nails': '/gallery/work-2.jpg',
  'add-ons': '/gallery/work-3.jpg',
};

export function serviceImageUrl(service: { id: string; image_path?: string | null }) {
  if (service.image_path) return publicImageUrl(service.image_path);
  return BUNDLED_SERVICE_PHOTOS[service.id] ?? '/gallery/work-1.jpg';
}

export const BUNDLED_GALLERY = Array.from({ length: 10 }, (_, i) => `/gallery/work-${i + 1}.jpg`);

/**
 * Shrink a photo in the browser before uploading. Phone photos are 3–6 MB;
 * served at that size, a gallery page would burn through Supabase's free
 * egress quickly. 1600px on the long edge is sharp on any screen.
 */
export async function downscaleImage(file: File, maxEdge = 1600, quality = 0.84): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // e.g. HEIC on a browser that can't decode it — upload as is
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return blob && blob.size < file.size ? blob : file;
}
