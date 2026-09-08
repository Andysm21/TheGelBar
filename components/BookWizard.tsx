'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import NailLoader from '@/components/NailLoader/NailLoader';
import SlotPicker from '@/components/SlotPicker';
import InspoUploader from '@/components/InspoUploader';
import { fetchCatalog, createBooking } from '@/lib/supabase/actions';
import { formatTime12h } from '@/lib/availability';
import styles from './BookWizard.module.css';

const STEPS = [
  { key: 'service', label: 'Service' },
  { key: 'options', label: 'Options' },
  { key: 'slot', label: 'Date & time' },
  { key: 'details', label: 'Details' },
] as const;
type StepKey = (typeof STEPS)[number]['key'];

interface Variant {
  id: string;
  kind: 'color' | 'simple' | 'complex';
  name_en: string;
  name_ar: string;
  price_egp: number;
  duration_minutes: number;
  requires_inspo: boolean;
}
interface Service {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  service_variants: Variant[];
}
interface Addon {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  price_egp: number;
  duration_minutes: number;
  is_quantity: boolean;
  max_quantity: number;
}

const SERVICE_IMAGES: Record<string, string> = {
  'gel-manicure': '/gallery/work-4.jpg',
  'hard-gel-overlay': '/gallery/work-6.jpg',
  'hard-gel-new-set': '/gallery/work-8.jpg',
  'false-nails': '/gallery/work-2.jpg',
};

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export default function BookWizard({ locale }: { locale: string }) {
  const t = useTranslations('booking');
  const isAr = locale === 'ar';

  const [services, setServices] = useState<Service[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [slotStep, setSlotStep] = useState(30);
  const [loaded, setLoaded] = useState(false);

  const [step, setStep] = useState<StepKey>('service');
  const [serviceId, setServiceId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [inspoPaths, setInspoPaths] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetchCatalog().then(({ services, addons, settings }) => {
      setServices(services as Service[]);
      setAddons(addons as Addon[]);
      setSlotStep((settings as any)?.slot_step_minutes ?? 30);
      setLoaded(true);
    });
  }, []);

  const service = services.find((s) => s.id === serviceId);
  const variant = service?.service_variants.find((v) => v.id === variantId);

  const { totalPrice, totalMinutes, pickedAddons } = useMemo(() => {
    let price = variant?.price_egp ?? 0;
    let minutes = variant?.duration_minutes ?? 0;
    const picked: { addon: Addon; qty: number }[] = [];
    for (const a of addons) {
      const qty = addonQty[a.id] ?? 0;
      if (qty > 0) {
        price += a.price_egp * qty;
        minutes += a.duration_minutes * qty;
        picked.push({ addon: a, qty });
      }
    }
    return { totalPrice: price, totalMinutes: minutes, pickedAddons: picked };
  }, [variant, addons, addonQty]);

  const needsInspo = variant?.requires_inspo ?? false;
  const canSubmit = !!variant && !!date && !!time && (!needsInspo || inspoPaths.length > 0);

  async function submit() {
    if (!canSubmit || !date || !time) return;
    setSubmitting(true);
    setError('');
    try {
      await createBooking({
        serviceId,
        variantId,
        addons: pickedAddons.map((p) => ({ addonId: p.addon.id, quantity: p.qty })),
        date,
        time,
        healthNotes: notes,
        inspoPaths,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <div className={styles.centered}>
        <NailLoader size="full" caption="Setting up your services…" />
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.centered}>
        <p className="eyebrow">Request sent</p>
        <h1 className={styles.doneTitle}>See you soon</h1>
        <p className={styles.subtle}>You'll get an email the moment Mariam confirms your time.</p>
        <div className={styles.doneCard}>
          <span className="badge badge-pending">{t('pending')}</span>
          <h3 className={styles.doneService}>
            {isAr ? service?.name_ar : service?.name_en} — {isAr ? variant?.name_ar : variant?.name_en}
          </h3>
          <p className={styles.subtle}>
            {date} · {time && formatTime12h(time)} · {formatDuration(totalMinutes)} · {totalPrice} EGP
          </p>
        </div>
        <a href={`/${locale}/bookings`} className="btn btn-solid">
          View my bookings
        </a>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className={styles.wrap}>
      {/* progress rail */}
      <ol className={styles.rail}>
        {STEPS.map((s, i) => (
          <li key={s.key} className={`${styles.railItem} ${i <= stepIndex ? styles.railDone : ''}`}>
            <span className={styles.railNum}>{i + 1}</span>
            <span className={styles.railLabel}>{s.label}</span>
          </li>
        ))}
      </ol>

      <div className={styles.layout}>
        <div className={styles.main}>
          {/* ---------------- STEP 1: service ---------------- */}
          {step === 'service' && (
            <section>
              <div className={styles.head}>
                <p className="eyebrow">Step 1 of 4</p>
                <h1 className={styles.title}>Choose your service</h1>
              </div>

              <div className={styles.serviceGrid}>
                {services.map((s) => {
                  const active = serviceId === s.id;
                  const from = Math.min(...s.service_variants.map((v) => v.price_egp));
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`${styles.serviceCard} ${active ? styles.serviceCardActive : ''}`}
                      onClick={() => {
                        setServiceId(s.id);
                        setVariantId('');
                        setDate(null);
                        setTime(null);
                      }}
                    >
                      <span className={styles.serviceImg}>
                        <img src={SERVICE_IMAGES[s.id] ?? '/gallery/work-1.jpg'} alt="" loading="lazy" />
                      </span>
                      <span className={styles.serviceBody}>
                        <span className={styles.serviceName}>{isAr ? s.name_ar : s.name_en}</span>
                        {(isAr ? s.description_ar : s.description_en) && (
                          <span className={styles.serviceDesc}>{isAr ? s.description_ar : s.description_en}</span>
                        )}
                        <span className={styles.serviceFrom}>from {from} EGP</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className={styles.actions}>
                <button className={`btn btn-solid ${styles.grow}`} disabled={!serviceId} onClick={() => setStep('options')}>
                  Continue →
                </button>
              </div>
            </section>
          )}

          {/* ---------------- STEP 2: variant + addons ---------------- */}
          {step === 'options' && service && (
            <section>
              <div className={styles.head}>
                <p className="eyebrow">Step 2 of 4</p>
                <h1 className={styles.title}>{isAr ? service.name_ar : service.name_en}</h1>
                <p className={styles.subtle}>Pick one finish — required.</p>
              </div>

              <div className={styles.options}>
                {service.service_variants.map((v) => {
                  const active = variantId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`${styles.option} ${active ? styles.optionActive : ''}`}
                      onClick={() => setVariantId(v.id)}
                    >
                      <span className={styles.radio} aria-hidden="true" />
                      <span className={styles.optionMain}>
                        <span className={styles.optionName}>{isAr ? v.name_ar : v.name_en}</span>
                        <span className={styles.optionMeta}>
                          {formatDuration(v.duration_minutes)}
                          {v.requires_inspo ? ' · inspo photo required' : ''}
                        </span>
                      </span>
                      <span className={styles.optionPrice}>{v.price_egp} EGP</span>
                    </button>
                  );
                })}
              </div>

              <p className={`eyebrow ${styles.groupLabel}`}>Add-ons — optional</p>
              <div className={styles.options}>
                {addons.map((a) => {
                  const qty = addonQty[a.id] ?? 0;
                  const active = qty > 0;
                  return (
                    <div key={a.id} className={`${styles.option} ${active ? styles.optionActive : ''}`}>
                      <button
                        type="button"
                        className={styles.checkbox}
                        aria-pressed={active}
                        onClick={() => setAddonQty((prev) => ({ ...prev, [a.id]: active ? 0 : 1 }))}
                      >
                        {active ? '✓' : ''}
                      </button>
                      <span className={styles.optionMain}>
                        <span className={styles.optionName}>{isAr ? a.name_ar : a.name_en}</span>
                        <span className={styles.optionMeta}>
                          {a.price_egp} EGP{a.is_quantity ? ' each' : ''}
                          {a.duration_minutes > 0 ? ` · +${formatDuration(a.duration_minutes)}` : ''}
                        </span>
                      </span>

                      {a.is_quantity && active ? (
                        <span className={styles.stepper}>
                          <button
                            type="button"
                            onClick={() => setAddonQty((p) => ({ ...p, [a.id]: Math.max(1, qty - 1) }))}
                            aria-label="Fewer"
                          >
                            −
                          </button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            onClick={() => setAddonQty((p) => ({ ...p, [a.id]: Math.min(a.max_quantity, qty + 1) }))}
                            aria-label="More"
                          >
                            +
                          </button>
                        </span>
                      ) : (
                        <span className={styles.optionPrice}>{active ? `${a.price_egp * qty} EGP` : ''}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className={styles.actions}>
                <button className="btn btn-ghost" onClick={() => setStep('service')}>
                  ← Back
                </button>
                <button className={`btn btn-solid ${styles.grow}`} disabled={!variantId} onClick={() => setStep('slot')}>
                  Continue →
                </button>
              </div>
            </section>
          )}

          {/* ---------------- STEP 3: date + time ---------------- */}
          {step === 'slot' && variant && (
            <section>
              <div className={styles.head}>
                <p className="eyebrow">Step 3 of 4</p>
                <h1 className={styles.title}>Pick a time</h1>
                <p className={styles.subtle}>
                  Showing slots that fit {formatDuration(totalMinutes)} — the full length of your booking.
                </p>
              </div>

              <SlotPicker
                durationMinutes={totalMinutes}
                slotStepMinutes={slotStep}
                selectedDate={date}
                selectedTime={time}
                onSelect={(d, tm) => {
                  setDate(d);
                  setTime(tm);
                }}
              />

              <div className={styles.actions}>
                <button className="btn btn-ghost" onClick={() => setStep('options')}>
                  ← Back
                </button>
                <button className={`btn btn-solid ${styles.grow}`} disabled={!date || !time} onClick={() => setStep('details')}>
                  Continue →
                </button>
              </div>
            </section>
          )}

          {/* ---------------- STEP 4: inspo + notes ---------------- */}
          {step === 'details' && variant && (
            <section>
              <div className={styles.head}>
                <p className="eyebrow">Step 4 of 4</p>
                <h1 className={styles.title}>Last details</h1>
              </div>

              {needsInspo && (
                <>
                  <p className={`eyebrow ${styles.groupLabel}`}>Inspiration photos — required</p>
                  <p className={styles.subtle} style={{ marginBottom: '1rem' }}>
                    You picked a {isAr ? variant.name_ar : variant.name_en.toLowerCase()}. Share references so Mariam can
                    price and plan it correctly.
                  </p>
                  <InspoUploader value={inspoPaths} onChange={setInspoPaths} required />
                </>
              )}

              {!needsInspo && (
                <>
                  <p className={`eyebrow ${styles.groupLabel}`}>Inspiration photos — optional</p>
                  <InspoUploader value={inspoPaths} onChange={setInspoPaths} />
                </>
              )}

              <p className={`eyebrow ${styles.groupLabel}`}>Health / allergy notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                style={{ marginBottom: '1.5rem' }}
              />

              <div className={styles.notice}>
                Designs are reviewed before confirming. If a design turns out to be more (or less) detailed than the
                option you picked, Mariam will email you the adjusted price before your appointment.
              </div>

              {error && <p className={styles.error}>{error}</p>}
              {needsInspo && inspoPaths.length === 0 && (
                <p className={styles.error}>Please add at least one inspiration photo to continue.</p>
              )}

              <div className={styles.actions}>
                <button className="btn btn-ghost" onClick={() => setStep('slot')}>
                  ← Back
                </button>
                <button className={`btn btn-solid ${styles.grow}`} disabled={!canSubmit || submitting} onClick={submit}>
                  {submitting && <NailLoader size="mini" />}
                  {submitting ? 'Sending…' : 'Request booking →'}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* ---------------- live summary ---------------- */}
        <aside className={styles.summary}>
          <p className="eyebrow">Your booking</p>

          {service ? (
            <div className={styles.sumRow}>
              <span className={styles.sumLabel}>Service</span>
              <span className={styles.sumValue}>{isAr ? service.name_ar : service.name_en}</span>
            </div>
          ) : (
            <p className={styles.sumEmpty}>Nothing picked yet.</p>
          )}

          {variant && (
            <div className={styles.sumRow}>
              <span className={styles.sumLabel}>Finish</span>
              <span className={styles.sumValue}>{isAr ? variant.name_ar : variant.name_en}</span>
            </div>
          )}

          {pickedAddons.map(({ addon, qty }) => (
            <div key={addon.id} className={styles.sumRow}>
              <span className={styles.sumLabel}>{isAr ? addon.name_ar : addon.name_en}</span>
              <span className={styles.sumValue}>
                {qty > 1 ? `×${qty} · ` : ''}
                {addon.price_egp * qty} EGP
              </span>
            </div>
          ))}

          {date && time && (
            <div className={styles.sumRow}>
              <span className={styles.sumLabel}>When</span>
              <span className={styles.sumValue}>
                {date}
                <br />
                {formatTime12h(time)}
              </span>
            </div>
          )}

          {variant && (
            <>
              <div className={styles.sumRow}>
                <span className={styles.sumLabel}>Duration</span>
                <span className={styles.sumValue}>{formatDuration(totalMinutes)}</span>
              </div>
              <div className={styles.sumTotal}>
                <span className={styles.sumLabel}>Total</span>
                <span className={styles.sumTotalValue}>{totalPrice} EGP</span>
              </div>
              <p className={styles.sumNote}>Paid in person at your appointment.</p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
