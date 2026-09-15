'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import NailLoader from '@/components/NailLoader/NailLoader';
import SlotPicker from '@/components/SlotPicker';
import InspoUploader from '@/components/InspoUploader';
import { fetchCatalog, createBooking } from '@/lib/supabase/actions';
import { formatTime12h } from '@/lib/availability';
import { serviceImageUrl } from '@/lib/site-images';
import styles from './BookWizard.module.css';

const STEPS = [
  { key: 'service', label: 'stepService' },
  { key: 'slot', label: 'stepSlot' },
  { key: 'details', label: 'stepConfirm' },
] as const;
type StepKey = (typeof STEPS)[number]['key'];

interface Variant {
  id: string;
  kind: string;
  name_en: string;
  name_ar: string;
  price_egp: number;
  duration_minutes: number;
  requires_inspo: boolean;
  is_quantity: boolean;
  max_quantity: number;
}
interface Service {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  image_path?: string | null;
  service_variants: Variant[];
}


export default function BookWizard({ locale }: { locale: string }) {
  const t = useTranslations('booking');
  const tf = useTranslations('bookFlow');
  const isAr = locale === 'ar';

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return tf('hoursMinutes', { h, m });
    if (h) return tf('hours', { h });
    return tf('minutes', { m });
  };
  const money = (n: number) => `${n.toLocaleString(isAr ? 'ar-EG' : 'en-US')} ${tf('currency')}`;

  const [services, setServices] = useState<Service[]>([]);
  const [slotStep, setSlotStep] = useState(30);
  const [loaded, setLoaded] = useState(false);

  const [step, setStep] = useState<StepKey>('service');
  const [serviceId, setServiceId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [inspoPaths, setInspoPaths] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetchCatalog().then(({ services, settings }) => {
      setServices(services as Service[]);
      setSlotStep((settings as any)?.slot_step_minutes ?? 30);
      setLoaded(true);
    });
  }, []);

  const service = services.find((s) => s.id === serviceId);
  const variant = service?.service_variants.find((v) => v.id === variantId);

  const { totalPrice, totalMinutes } = useMemo(() => {
    const units = variant?.is_quantity ? quantity : 1;
    return {
      totalPrice: (variant?.price_egp ?? 0) * units,
      totalMinutes: (variant?.duration_minutes ?? 0) * units,
    };
  }, [variant, quantity]);

  const needsInspo = variant?.requires_inspo ?? false;
  const canSubmit = !!variant && !!date && !!time && (!needsInspo || inspoPaths.length > 0);

  /** Picking a different option invalidates a slot chosen for the old length. */
  function pickVariant(s: Service, v: Variant) {
    setServiceId(s.id);
    setVariantId(v.id);
    setQuantity(1);
    setDate(null);
    setTime(null);
  }

  async function submit() {
    if (!canSubmit || !date || !time) return;
    setSubmitting(true);
    setError('');
    try {
      await createBooking({
        serviceId,
        variantId,
        quantity: variant?.is_quantity ? quantity : 1,
        date,
        time,
        healthNotes: notes,
        inspoPaths,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : tf('genericError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <div className={styles.centered}>
        <NailLoader size="full" caption={tf('loading')} />
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.centered}>
        <p className="eyebrow">{tf('sentEyebrow')}</p>
        <h1 className={styles.doneTitle}>{tf('sentTitle')}</h1>
        <p className={styles.subtle}>{tf('sentBody')}</p>
        <div className={styles.doneCard}>
          <span className="badge badge-pending">{t('pending')}</span>
          <h3 className={styles.doneService}>
            {isAr ? service?.name_ar : service?.name_en} — {isAr ? variant?.name_ar : variant?.name_en}
            {variant?.is_quantity ? ` ×${quantity}` : ''}
          </h3>
          <p className={styles.subtle}>
            {date} · {time && formatTime12h(time)} · {formatDuration(totalMinutes)} · {money(totalPrice)}
          </p>
        </div>
        <a href={`/${locale}/bookings`} className="btn btn-solid">
          {tf('viewBookings')}
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
            <span className={styles.railLabel}>{tf(s.label)}</span>
          </li>
        ))}
      </ol>

      <div className={styles.layout}>
        <div className={styles.main}>
          {/* ---------------- STEP 1: service, expanding to its options ---------------- */}
          {step === 'service' && (
            <section>
              <div className={styles.head}>
                <p className="eyebrow">{tf('stepOf', { n: 1, total: 3 })}</p>
                <h1 className={styles.title}>{tf('chooseService')}</h1>
                <p className={styles.subtle}>{tf('chooseServiceHint')}</p>
              </div>

              <div className={styles.accordion}>
                {services.map((s) => {
                  const open = serviceId === s.id;
                  const from = Math.min(...s.service_variants.map((v) => v.price_egp));
                  return (
                    <div key={s.id} className={`${styles.accItem} ${open ? styles.accItemOpen : ''}`}>
                      <button
                        type="button"
                        className={styles.accHead}
                        aria-expanded={open}
                        onClick={() => {
                          if (open) {
                            // Collapsing clears the choice too, so Continue can't
                            // advance with an option whose service is closed.
                            setServiceId('');
                            setVariantId('');
                          } else {
                            setServiceId(s.id);
                            setVariantId('');
                            setQuantity(1);
                            setDate(null);
                            setTime(null);
                          }
                        }}
                      >
                        <span className={styles.accThumb}>
                          <img src={serviceImageUrl(s)} alt="" loading="lazy" />
                        </span>
                        <span className={styles.accInfo}>
                          <span className={styles.accName}>{isAr ? s.name_ar : s.name_en}</span>
                          {(isAr ? s.description_ar : s.description_en) && (
                            <span className={styles.accDesc}>{isAr ? s.description_ar : s.description_en}</span>
                          )}
                          <span className={styles.accFrom}>{tf('from', { price: money(from) })}</span>
                        </span>
                        <span className={styles.accChevron} aria-hidden="true" />
                      </button>

                      <div className={styles.accPanel}>
                        <div className={styles.accPanelInner}>
                          <p className={`eyebrow ${styles.groupLabel}`}>{tf('chooseOne')}</p>
                          <div className={styles.options}>
                            {s.service_variants.map((v) => {
                              const active = variantId === v.id;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  className={`${styles.option} ${active ? styles.optionActive : ''}`}
                                  onClick={() => pickVariant(s, v)}
                                >
                                  <span className={styles.radio} aria-hidden="true" />
                                  <span className={styles.optionMain}>
                                    <span className={styles.optionName}>{isAr ? v.name_ar : v.name_en}</span>
                                    <span className={styles.optionMeta}>
                                      {formatDuration(v.duration_minutes)}
                                      {v.is_quantity ? ` ${tf('each')}` : ''}
                                      {v.requires_inspo ? ` · ${tf('inspoRequiredTag')}` : ''}
                                    </span>
                                  </span>
                                  <span className={styles.optionPrice}>
                                    {money(v.price_egp)}
                                    {v.is_quantity ? ` ${tf('each')}` : ''}
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {variant?.is_quantity && variantId.startsWith(s.id) && (
                            <div className={styles.qtyRow}>
                              <span className={styles.qtyLabel}>{tf('howMany')}</span>
                              <span className={styles.stepper}>
                                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label={tf('fewer')}>
                                  −
                                </button>
                                <span>{quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => setQuantity((q) => Math.min(variant.max_quantity, q + 1))}
                                  aria-label={tf('more')}
                                >
                                  +
                                </button>
                              </span>
                              <span className={styles.qtyTotal}>{money(totalPrice)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.actions}>
                <button className={`btn btn-solid ${styles.grow}`} disabled={!variant} onClick={() => setStep('slot')}>
                  {tf('continue')}
                </button>
              </div>
            </section>
          )}

          {/* ---------------- STEP 2: date + time ---------------- */}
          {step === 'slot' && variant && (
            <section>
              <div className={styles.head}>
                <p className="eyebrow">{tf('stepOf', { n: 2, total: 3 })}</p>
                <h1 className={styles.title}>{tf('pickTime')}</h1>
                <p className={styles.subtle}>
                  {tf('pickTimeHint', { duration: formatDuration(totalMinutes) })}
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
                <button className="btn btn-ghost" onClick={() => setStep('service')}>
                  {tf('back')}
                </button>
                <button className={`btn btn-solid ${styles.grow}`} disabled={!date || !time} onClick={() => setStep('details')}>
                  {tf('continue')}
                </button>
              </div>
            </section>
          )}

          {/* ---------------- STEP 3: confirm ---------------- */}
          {step === 'details' && variant && (
            <section>
              <div className={styles.head}>
                <p className="eyebrow">{tf('stepOf', { n: 3, total: 3 })}</p>
                <h1 className={styles.title}>{tf('confirmTitle')}</h1>
              </div>

              {needsInspo && (
                <>
                  <p className={`eyebrow ${styles.groupLabel}`}>{tf('inspoRequired')}</p>
                  <p className={styles.subtle} style={{ marginBottom: '1rem' }}>
                    {tf('inspoRequiredHint', { option: isAr ? variant.name_ar : variant.name_en.toLowerCase() })}
                  </p>
                  <InspoUploader value={inspoPaths} onChange={setInspoPaths} required />
                </>
              )}

              {!needsInspo && (
                <>
                  <p className={`eyebrow ${styles.groupLabel}`}>{tf('inspoOptional')}</p>
                  <InspoUploader value={inspoPaths} onChange={setInspoPaths} />
                </>
              )}

              <p className={`eyebrow ${styles.groupLabel}`}>{tf('notesLabel')}</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                style={{ marginBottom: '1.5rem' }}
              />

              <div className={styles.notice}>
                {tf('reviewNotice')}
              </div>

              {error && <p className={styles.error}>{error}</p>}
              {needsInspo && inspoPaths.length === 0 && (
                <p className={styles.error}>{tf('inspoMissing')}</p>
              )}

              <div className={styles.actions}>
                <button className="btn btn-ghost" onClick={() => setStep('slot')}>
                  {tf('back')}
                </button>
                <button className={`btn btn-solid ${styles.grow}`} disabled={!canSubmit || submitting} onClick={submit}>
                  {submitting && <NailLoader size="mini" />}
                  {submitting ? tf('sending') : tf('request')}
                </button>
              </div>
            </section>
          )}
        </div>

        {/* ---------------- live summary ---------------- */}
        <aside className={styles.summary}>
          <p className="eyebrow">{tf('summaryTitle')}</p>

          {service ? (
            <div className={styles.sumRow}>
              <span className={styles.sumLabel}>{tf('summaryService')}</span>
              <span className={styles.sumValue}>{isAr ? service.name_ar : service.name_en}</span>
            </div>
          ) : (
            <p className={styles.sumEmpty}>{tf('summaryEmpty')}</p>
          )}

          {variant && (
            <div className={styles.sumRow}>
              <span className={styles.sumLabel}>{tf('summaryOption')}</span>
              <span className={styles.sumValue}>
                {isAr ? variant.name_ar : variant.name_en}
                {variant.is_quantity ? ` ×${quantity}` : ''}
              </span>
            </div>
          )}

          {date && time && (
            <div className={styles.sumRow}>
              <span className={styles.sumLabel}>{tf('summaryWhen')}</span>
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
                <span className={styles.sumLabel}>{tf('summaryDuration')}</span>
                <span className={styles.sumValue}>{formatDuration(totalMinutes)}</span>
              </div>
              <div className={styles.sumTotal}>
                <span className={styles.sumLabel}>{tf('summaryTotal')}</span>
                <span className={styles.sumTotalValue}>{money(totalPrice)}</span>
              </div>
              <p className={styles.sumNote}>{tf('payInPerson')}</p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
