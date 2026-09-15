'use client';

import { createClient } from '@/lib/supabase/client';
import { SITE_IMAGES_BUCKET, downscaleImage } from '@/lib/site-images';

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Shrinks and uploads one photo to the public site bucket as the signed-in
 * owner (storage policy enforces that), returning its storage path.
 */
export async function uploadSitePhoto(file: File, folder: 'gallery' | 'services') {
  if (!file.type.startsWith('image/')) throw new Error(`"${file.name}" is not an image.`);
  if (file.size > MAX_BYTES) throw new Error(`"${file.name}" is over 12 MB.`);

  const blob = await downscaleImage(file);
  const isJpeg = blob.type === 'image/jpeg';
  const ext = isJpeg ? 'jpg' : file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const supabase = createClient();
  const { error } = await supabase.storage.from(SITE_IMAGES_BUCKET).upload(path, blob, {
    // Paths are never reused, so browsers and the CDN may cache for a year.
    cacheControl: '31536000',
    contentType: blob.type || file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}
