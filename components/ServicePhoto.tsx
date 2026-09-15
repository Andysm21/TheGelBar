'use client';

import { useRef, useState } from 'react';
import { setServiceImage } from '@/lib/supabase/actions';
import { serviceImageUrl } from '@/lib/site-images';
import { uploadSitePhoto } from '@/lib/upload-site-photo';
import styles from './ServicePhoto.module.css';

/** The photo shown for a service on the Services page, home page and booking flow. */
export default function ServicePhoto({ serviceId, imagePath }: { serviceId: string; imagePath: string | null }) {
  const [path, setPath] = useState(imagePath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const uploaded = await uploadSitePhoto(file, 'services');
      await setServiceImage(serviceId, uploaded);
      setPath(uploaded);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function reset() {
    setBusy(true);
    setError('');
    try {
      await setServiceImage(serviceId, null);
      setPath(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove the photo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={`${styles.thumb} ${busy ? styles.busy : ''}`}>
        <img src={serviceImageUrl({ id: serviceId, image_path: path })} alt="" />
      </div>
      <div className={styles.actions}>
        <label className={styles.change}>
          <input ref={inputRef} type="file" accept="image/*" disabled={busy} onChange={(e) => pick(e.target.files)} />
          {busy ? 'Saving…' : path ? 'Change photo' : 'Upload photo'}
        </label>
        {path && !busy && (
          <button type="button" className={styles.reset} onClick={reset}>
            Use default
          </button>
        )}
        {error && <span className={styles.error}>{error}</span>}
      </div>
    </div>
  );
}
