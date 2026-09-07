'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatDuration } from '@/lib/format';
import Calendar, { DayAvailability } from '@/components/Calendar/Calendar';
import NailLoader from '@/components/NailLoader/NailLoader';
import { fetchMonthAvailability, fetchOpenTimesForDate, fetchServiceCatalog, fetchDesignOptions, createBooking } from '@/lib/supabase/actions';
import styles from './BookWizard.module.css';

const STEPS = ['service', 'slot', 'details'] as const;
type Step = (typeof STEPS)[number];

interface DbService {
  id: string;
  name_en: string;
  name_ar: string;
  base_price_egp: number;
  base_minutes: number;
  design_tier: 'none' | 'simple' | 'complex';
}

interface DbDesign {
  id: string;
  name_en: string;
  name_ar: string;
  price_egp: number;
  tier: 'simple' | 'complex';
}

function formatTime24to12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export default function BookWizard({ locale }: { locale: string }) {
  const t = useTranslations('booking');

  const [catalog, setCatalog] = useState<DbService[]>([]);
  const [designs, setDesigns] = useState<DbDesign[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  const [step, setStep] = useState<Step>('service');
  const [serviceId, setServiceId] = useState<string>('');
  const [designId, setDesignId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchServiceCatalog(), fetchDesignOptions()]).then(([services, designOpts]) => {
      setCatalog(services as DbService[]);
      setDesigns(designOpts as DbDesign[]);
      setServiceId((services as DbService[])[0]?.id ?? '');
      setCatalogLoaded(true);
    });
  }, []);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [openTimes, setOpenTimes] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingTimes, setLoadingTimes] = useState(false);

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const service = catalog.find((s) => s.id === serviceId);
  const designOptions = service ? designs.filter((d) => d.tier === service.design_tier) : [];
  const { totalMinutes, totalPriceEgp } = useMemo(() => {
    const design = designId ? designs.find((d) => d.id === designId) : undefined;
    return {
      totalMinutes: service?.base_minutes ?? 0,
      totalPriceEgp: (service?.base_price_egp ?? 0) + (design?.price_egp ?? 0),
    };
  }, [service, designId, designs]);
  const requiresDesign = service ? service.design_tier !== 'none' : false;
  const canContinueFromService = !requiresDesign || !!designId;

  useEffect(() => {
    let cancelled = false;
    fetchMonthAvailability(calYear, calMonth).then(({ slots, blockedDates }) => {
      if (cancelled) return;
      const byDate = new Map<string, number>();
      for (const row of slots) byDate.set(row.date, (byDate.get(row.date) ?? 0) + 1);
      const days: DayAvailability[] = [];
      for (const [date, count] of byDate) {
        if (blockedDates.includes(date)) continue;
        days.push({ date, openCount: count });
      }
      for (const date of blockedDates) days.push({ date, blocked: true });
      setAvailability(days);
    });
    return () => {
      cancelled = true;
    };
  }, [calYear, calMonth]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingTimes(true);
    setSelectedTime(null);
    fetchOpenTimesForDate(selectedDate).then((rows) => {
      setOpenTimes(rows.map((r) => r.start_time.slice(0, 5)));
      setLoadingTimes(false);
    });
  }, [selectedDate]);

  async function handleSubmit() {
    if (!selectedDate || !selectedTime) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await createBooking({ serviceId, designId, date: selectedDate, time: selectedTime, healthNotes: notes });
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Something went wrong — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!catalogLoaded || !service) {
    return (
      <div className={styles.done}>
        <NailLoader size="full" caption="Setting up your services…" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={styles.done}>
        <p className="eyebrow">Request sent</p>
        <h1 className={styles.doneTitle}>See you soon</h1>
        <p className={styles.subtle}>You'll get an email once Mariam confirms the time.</p>
        <div className={styles.doneCard}>
          <span className="badge badge-pending">{t('pending')}</span>
          <h3 className={styles.doneService}>{locale === 'ar' ? service.name_ar : service.name_en}</h3>
          <p className={styles.subtle}>
            {selectedDate} · {selectedTime && formatTime24to12(selectedTime)} · {formatDuration(totalMinutes)} ·{' '}
            {totalPriceEgp} EGP
          </p>
        </div>
        <a href={`/${locale}/bookings`} className="btn btn-solid">
          View my bookings
        </a>
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className={styles.wrap}>
      <div className={styles.steps} aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s} className={`${styles.stepDot} ${i <= stepIndex ? styles.stepDotActive : ''}`} />
        ))}
      </div>

      {step === 'service' && (
        <>
          <div className={styles.head}>
            <p className="eyebrow">{t('step1')}</p>
            <h1 className={styles.title}>Choose your service</h1>
          </div>

          <div className={styles.options}>
            {catalog.map((svc) => {
              const isSelected = serviceId === svc.id;
              return (
                <label key={svc.id} className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}>
                  <input
                    type="radio"
                    name="service"
                    checked={isSelected}
                    onChange={() => {
                      setServiceId(svc.id);
                      setDesignId(null);
                    }}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                  />
                  <span className={styles.radio} aria-hidden="true" />
                  <span className={styles.optionMain}>
                    <span className={styles.optionName}>{locale === 'ar' ? svc.name_ar : svc.name_en}</span>
                    {svc.base_minutes > 0 && <span className={styles.optionMeta}>{formatDuration(svc.base_minutes)}</span>}
                  </span>
                  <span className={styles.optionPrice}>{svc.base_price_egp} EGP</span>
                </label>
              );
            })}
          </div>

          {requiresDesign && (
            <>
              <p className={`eyebrow ${styles.groupLabel}`}>Pick a design</p>
              <div className={styles.options}>
                {designOptions.map((d) => {
                  const isSelected = designId === d.id;
                  return (
                    <label key={d.id} className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}>
                      <input
                        type="radio"
                        name="design"
                        checked={isSelected}
                        onChange={() => setDesignId(d.id)}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                      />
                      <span className={styles.radio} aria-hidden="true" />
                      <span className={styles.optionMain}>
                        <span className={styles.optionName}>{locale === 'ar' ? d.name_ar : d.name_en}</span>
                      </span>
                      <span className={styles.optionPrice}>+{d.price_egp} EGP</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          <div className={styles.summary}>
            <div>
              <div className={styles.summaryLabel}>{t('duration')}</div>
              <div className={styles.summaryValue}>{formatDuration(totalMinutes)}</div>
            </div>
            <div style={{ textAlign: 'end' }}>
              <div className={styles.summaryLabel}>{t('total')}</div>
              <div className={styles.summaryValue}>{totalPriceEgp} EGP</div>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={`btn btn-solid ${styles.btnGrow}`} disabled={!canContinueFromService} onClick={() => setStep('slot')}>
              {t('continue')} →
            </button>
          </div>
        </>
      )}

      {step === 'slot' && (
        <>
          <div className={styles.head}>
            <p className="eyebrow">{t('step2')}</p>
            <h1 className={styles.title}>{locale === 'ar' ? service.name_ar : service.name_en}</h1>
            <p className={styles.subtle}>
              {formatDuration(totalMinutes)} needed · {totalPriceEgp} EGP total
            </p>
          </div>

          <Calendar
            year={calYear}
            month={calMonth}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onMonthChange={(y, m) => {
              setCalYear(y);
              setCalMonth(m);
            }}
            availability={availability}
          />

          {selectedDate && (
            <>
              <p className={`eyebrow ${styles.slotLabel}`}>Open times — {selectedDate}</p>
              {loadingTimes ? (
                <NailLoader size="inline" />
              ) : openTimes.length === 0 ? (
                <p className={styles.empty}>No open times this day.</p>
              ) : (
                <div className={styles.slots}>
                  {openTimes.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`${styles.slot} ${selectedTime === time ? styles.slotActive : ''}`}
                    >
                      {formatTime24to12(time)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div className={styles.actions}>
            <button className="btn btn-ghost" onClick={() => setStep('service')}>
              ← Back
            </button>
            <button
              className={`btn btn-solid ${styles.btnGrow}`}
              disabled={!selectedDate || !selectedTime}
              onClick={() => setStep('details')}
            >
              {t('continue')} →
            </button>
          </div>
        </>
      )}

      {step === 'details' && (
        <>
          <div className={styles.head}>
            <p className="eyebrow">{t('step3')}</p>
            <h1 className={styles.title}>{t('notes')}</h1>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
            style={{ marginBottom: '1.5rem' }}
          />

          <div className={styles.notice}>{t('rescheduleWindowNotice')}</div>

          {submitError && <p className={styles.error}>{submitError}</p>}

          <div className={styles.actions}>
            <button className="btn btn-ghost" onClick={() => setStep('slot')}>
              ← Back
            </button>
            <button className={`btn btn-solid ${styles.btnGrow}`} disabled={submitting} onClick={handleSubmit}>
              {submitting && <NailLoader size="mini" />}
              {submitting ? 'Sending…' : `${t('requestBooking')} →`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
