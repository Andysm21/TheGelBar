'use client';

import { useState, useTransition } from 'react';
import { updateService, updateVariant, updateAddon, updateSettings, refreshCatalogCache } from '@/lib/supabase/actions';
import styles from './CatalogEditor.module.css';

interface Variant {
  id: string;
  kind: string;
  name_en: string;
  price_egp: number;
  duration_minutes: number;
  requires_inspo: boolean;
  is_active: boolean;
}
interface Service {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  is_active: boolean;
  service_variants: Variant[];
}
interface Addon {
  id: string;
  name_en: string;
  price_egp: number;
  duration_minutes: number;
  is_quantity: boolean;
  max_quantity: number;
  is_active: boolean;
}

/** Small inline editor that only fires a save when the value changed. */
function NumberCell({
  value,
  suffix,
  onSave,
  min = 0,
}: {
  value: number;
  suffix: string;
  onSave: (n: number) => void;
  min?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const [dirty, setDirty] = useState(false);

  return (
    <span className={styles.numberCell}>
      <input
        type="number"
        min={min}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setDirty(true);
        }}
        onBlur={() => {
          const n = Number(draft);
          if (!dirty) return;
          if (!Number.isFinite(n) || n < min) {
            setDraft(String(value));
            setDirty(false);
            return;
          }
          setDirty(false);
          if (n !== value) onSave(n);
        }}
        className={styles.numberInput}
      />
      <span className={styles.suffix}>{suffix}</span>
    </span>
  );
}

export default function CatalogEditor({
  services,
  addons,
  settings,
}: {
  services: Service[];
  addons: Addon[];
  settings: { slot_step_minutes: number; owner_email: string };
}) {
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  function run(label: string, fn: () => Promise<void>) {
    setError('');
    startTransition(async () => {
      try {
        await fn();
        setFlash(label);
        setTimeout(() => setFlash(''), 2200);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save.');
      }
    });
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.status}>
          {pending && <span className={styles.saving}>Saving…</span>}
          {!pending && flash && <span className={styles.saved}>✓ {flash}</span>}
          {error && <span className={styles.error}>{error}</span>}
        </div>
        <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run('Cache refreshed', refreshCatalogCache)}>
          ↻ Refresh public site
        </button>
      </div>

      {services.map((s) => (
        <section key={s.id} className={styles.service}>
          <header className={styles.serviceHead}>
            <div>
              <p className="eyebrow">Service</p>
              <input
                className={styles.serviceName}
                defaultValue={s.name_en}
                onBlur={(e) => {
                  if (e.target.value !== s.name_en) run('Name saved', () => updateService(s.id, { name_en: e.target.value }));
                }}
              />
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                defaultChecked={s.is_active}
                onChange={(e) => run(e.target.checked ? 'Service shown' : 'Service hidden', () => updateService(s.id, { is_active: e.target.checked }))}
              />
              Visible
            </label>
          </header>

          <textarea
            className={styles.desc}
            placeholder="Description shown to clients (optional)"
            defaultValue={s.description_en}
            onBlur={(e) => {
              if (e.target.value !== s.description_en)
                run('Description saved', () => updateService(s.id, { description_en: e.target.value }));
            }}
          />

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Option</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Inspo</th>
                <th>Live</th>
              </tr>
            </thead>
            <tbody>
              {s.service_variants.map((v) => (
                <tr key={v.id}>
                  <td className={styles.variantName} data-label="Option">{v.name_en}</td>
                  <td data-label="Price">
                    <NumberCell
                      value={v.price_egp}
                      suffix="EGP"
                      onSave={(n) => run(`${v.name_en} price saved`, () => updateVariant(v.id, { price_egp: n }))}
                    />
                  </td>
                  <td data-label="Duration">
                    <NumberCell
                      value={v.duration_minutes}
                      suffix="min"
                      min={5}
                      onSave={(n) => run(`${v.name_en} duration saved`, () => updateVariant(v.id, { duration_minutes: n }))}
                    />
                  </td>
                  <td data-label="Inspo required">
                    <input
                      type="checkbox"
                      defaultChecked={v.requires_inspo}
                      onChange={(e) => run('Inspo rule saved', () => updateVariant(v.id, { requires_inspo: e.target.checked }))}
                    />
                  </td>
                  <td data-label="Live on site">
                    <input
                      type="checkbox"
                      defaultChecked={v.is_active}
                      onChange={(e) => run('Option saved', () => updateVariant(v.id, { is_active: e.target.checked }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <section className={styles.service}>
        <header className={styles.serviceHead}>
          <div>
            <p className="eyebrow">Extras</p>
            <h3 className={styles.sectionTitle}>Add-ons</h3>
          </div>
        </header>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Add-on</th>
              <th>Price</th>
              <th>Duration</th>
              <th>Max qty</th>
              <th>Live</th>
            </tr>
          </thead>
          <tbody>
            {addons.map((a) => (
              <tr key={a.id}>
                <td className={styles.variantName} data-label="Add-on">
                  {a.name_en}
                  {a.is_quantity && <span className={styles.qtyTag}>per unit</span>}
                </td>
                <td data-label="Price">
                  <NumberCell
                    value={a.price_egp}
                    suffix="EGP"
                    onSave={(n) => run(`${a.name_en} price saved`, () => updateAddon(a.id, { price_egp: n }))}
                  />
                </td>
                <td data-label="Duration">
                  <NumberCell
                    value={a.duration_minutes}
                    suffix="min"
                    onSave={(n) => run(`${a.name_en} duration saved`, () => updateAddon(a.id, { duration_minutes: n }))}
                  />
                </td>
                <td data-label="Max qty">
                  {a.is_quantity ? (
                    <NumberCell
                      value={a.max_quantity}
                      suffix="max"
                      min={1}
                      onSave={(n) => run('Max quantity saved', () => updateAddon(a.id, { max_quantity: n }))}
                    />
                  ) : (
                    <span className={styles.dash}>—</span>
                  )}
                </td>
                <td data-label="Live on site">
                  <input
                    type="checkbox"
                    defaultChecked={a.is_active}
                    onChange={(e) => run('Add-on saved', () => updateAddon(a.id, { is_active: e.target.checked }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.service}>
        <header className={styles.serviceHead}>
          <div>
            <p className="eyebrow">Booking</p>
            <h3 className={styles.sectionTitle}>Settings</h3>
          </div>
        </header>
        <div className={styles.settingsGrid}>
          <label className={styles.setting}>
            Start times every
            <select
              defaultValue={String(settings.slot_step_minutes)}
              onChange={(e) => run('Slot spacing saved', () => updateSettings({ slot_step_minutes: Number(e.target.value) }))}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
            </select>
            <span className={styles.hint}>
              How the free hours get sliced into bookable start times.
            </span>
          </label>

          <label className={styles.setting}>
            Notification email
            <input
              type="email"
              defaultValue={settings.owner_email}
              onBlur={(e) => {
                if (e.target.value !== settings.owner_email)
                  run('Email saved', () => updateSettings({ owner_email: e.target.value }));
              }}
            />
            <span className={styles.hint}>Where new booking alerts are sent.</span>
          </label>
        </div>
      </section>
    </div>
  );
}
