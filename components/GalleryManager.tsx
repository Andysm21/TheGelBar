'use client';

import { useRef, useState, useTransition } from 'react';
import {
  addGalleryImages,
  deleteGalleryImage,
  reorderGallery,
  updateGalleryCaption,
} from '@/lib/supabase/actions';
import { publicImageUrl } from '@/lib/site-images';
import { uploadSitePhoto } from '@/lib/upload-site-photo';
import styles from './GalleryManager.module.css';

interface Photo {
  id: string;
  storage_path: string;
  caption: string;
}

export default function GalleryManager({ initial }: { initial: Photo[] }) {
  const [photos, setPhotos] = useState(initial);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    const list = Array.from(files);
    setUploading({ done: 0, total: list.length });

    const paths: string[] = [];
    const problems: string[] = [];
    for (const file of list) {
      try {
        paths.push(await uploadSitePhoto(file, 'gallery'));
      } catch (e) {
        problems.push(e instanceof Error ? e.message : `Could not upload "${file.name}".`);
      }
      setUploading((u) => (u ? { ...u, done: u.done + 1 } : u));
    }

    try {
      if (paths.length) {
        const saved = await addGalleryImages(paths);
        setPhotos((prev) => [...prev, ...saved]);
      }
    } catch (e) {
      problems.push(e instanceof Error ? e.message : 'Could not save the photos.');
    }

    setUploading(null);
    if (problems.length) setError(problems.join(' '));
    if (inputRef.current) inputRef.current.value = '';
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    setPhotos(next);
    const ids = next.map((p) => p.id);
    startTransition(async () => {
      try {
        await reorderGallery(ids);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save the new order.');
      }
    });
  }

  function remove(photo: Photo) {
    if (!confirm('Remove this photo from the website?')) return;
    const before = photos;
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    startTransition(async () => {
      try {
        await deleteGalleryImage(photo.id);
      } catch (e) {
        setPhotos(before);
        setError(e instanceof Error ? e.message : 'Could not remove the photo.');
      }
    });
  }

  return (
    <div>
      <label
        className={`${styles.drop} ${uploading ? styles.dropBusy : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className={styles.fileInput}
          disabled={!!uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <span className={styles.dropTitle}>
          {uploading ? `Uploading ${uploading.done} of ${uploading.total}…` : 'Add photos'}
        </span>
        <span className={styles.dropHint}>
          Tap to choose, or drop photos here. They are resized automatically before upload.
        </span>
      </label>

      {error && <p className={styles.error}>{error}</p>}

      {photos.length === 0 ? (
        <p className={styles.empty}>
          No photos yet. Until you add some, the Our Work page shows the studio&apos;s starter photos.
        </p>
      ) : (
        <ol className={styles.grid}>
          {photos.map((photo, i) => (
            <li key={photo.id} className={styles.item}>
              <div className={styles.thumb}>
                <img src={publicImageUrl(photo.storage_path)} alt={photo.caption} loading="lazy" />
                <span className={styles.position}>{i + 1}</span>
              </div>
              <input
                className={styles.caption}
                defaultValue={photo.caption}
                placeholder="Caption (optional)"
                maxLength={140}
                onBlur={(e) => {
                  if (e.target.value === photo.caption) return;
                  const value = e.target.value;
                  startTransition(async () => {
                    try {
                      await updateGalleryCaption(photo.id, value);
                      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, caption: value } : p)));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Could not save the caption.');
                    }
                  });
                }}
              />
              <div className={styles.controls}>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || pending} aria-label="Move earlier">
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === photos.length - 1 || pending}
                  aria-label="Move later"
                >
                  →
                </button>
                <button type="button" className={styles.remove} onClick={() => remove(photo)} disabled={pending}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
