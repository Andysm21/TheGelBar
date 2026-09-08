'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './InspoUploader.module.css';

interface Uploaded {
  path: string;
  previewUrl: string;
  name: string;
}

const MAX_FILES = 6;
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Uploads reference photos straight to the private `inspo-images` bucket
 * under the signed-in user's folder (which is what the storage RLS
 * policy keys on), and hands the resulting paths back to the booking
 * form. A real <input type="file"> is always present — the dashed area
 * is just a label for it, so tapping it works on phones.
 */
export default function InspoUploader({
  value,
  onChange,
  required,
}: {
  value: string[];
  onChange: (paths: string[]) => void;
  required?: boolean;
}) {
  const [items, setItems] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError('');

    const room = MAX_FILES - items.length;
    if (room <= 0) {
      setError(`You can upload up to ${MAX_FILES} photos.`);
      return;
    }

    const picked = Array.from(files).slice(0, room);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in again to upload photos.');
        return;
      }

      const added: Uploaded[] = [];
      for (const file of picked) {
        if (!file.type.startsWith('image/')) {
          setError('Only image files can be uploaded.');
          continue;
        }
        if (file.size > MAX_BYTES) {
          setError('Each photo must be under 8 MB.');
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('inspo-images').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (upErr) {
          setError(upErr.message);
          continue;
        }
        added.push({ path, previewUrl: URL.createObjectURL(file), name: file.name });
      }

      if (added.length > 0) {
        const next = [...items, ...added];
        setItems(next);
        onChange(next.map((i) => i.path));
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function remove(path: string) {
    const next = items.filter((i) => i.path !== path);
    setItems(next);
    onChange(next.map((i) => i.path));
  }

  return (
    <div>
      <label
        className={`${styles.drop} ${dragging ? styles.dropActive : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className={styles.input}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <span className={styles.dropIcon} aria-hidden="true">
          ✚
        </span>
        <span className={styles.dropTitle}>{busy ? 'Uploading…' : 'Add inspiration photos'}</span>
        <span className={styles.dropHint}>
          Tap to choose, or drag images here · up to {MAX_FILES} · max 8 MB each
          {required ? ' · required for this design' : ''}
        </span>
      </label>

      {error && <p className={styles.error}>{error}</p>}

      {items.length > 0 && (
        <div className={styles.grid}>
          {items.map((item) => (
            <div key={item.path} className={styles.thumb}>
              <img src={item.previewUrl} alt={item.name} />
              <button type="button" onClick={() => remove(item.path)} aria-label={`Remove ${item.name}`}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
