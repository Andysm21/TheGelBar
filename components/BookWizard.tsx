'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatDuration } from '@/lib/format';
import Calendar, { DayAvailability } from '@/components/Calendar/Calendar';
import NailLoader from '@/components/NailLoader/NailLoader';
import { fetchMonthAvailability, fetchOpenTimesForDate, fetchServiceCatalog, fetchDesignOptions, createBooking } from '@/lib/supabase/actions';

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

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (!catalogLoaded || !service) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '3rem 1.25rem', textAlign: 'center' }}>
        <NailLoader size="full" caption="Setting up your services…" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '3rem 1.25rem', textAlign: 'center' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#fbe6d4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.2rem',
            fontSize: '1.8rem',
          }}
        >
          ⏳
        </div>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--deep)', marginBottom: '.4rem' }}>Request sent!</h1>
        <p className="sans" style={{ color: 'var(--sub)', marginBottom: '1.5rem' }}>
          You'll get an email once it's confirmed.
        </p>
        <div className="card" style={{ textAlign: 'left' }}>
          <span className="badge badge-pending" style={{ marginBottom: '.6rem', display: 'inline-block' }}>
            {t('pending')}
          </span>
          <h3 style={{ fontSize: '1.05rem' }}>{locale === 'ar' ? service.name_ar : service.name_en}</h3>
          <p className="sans" style={{ fontSize: '.8rem', color: 'var(--sub)', marginTop: '.4rem' }}>
            {selectedDate} · {selectedTime && formatTime24to12(selectedTime)} · {formatDuration(totalMinutes)} · {totalPriceEgp} EGP
          </p>
        </div>
        <a href={`/${locale}/bookings`} className="btn btn-primary btn-block" style={{ marginTop: '1.2rem' }}>
          View my bookings
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.25rem 1rem 4rem' }}>
      {step === 'service' && (
        <>
          <p className="sans" style={{ fontSize: '.68rem', color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {t('step1')}
          </p>
          <h1 style={{ fontSize: '1.4rem', color: 'var(--deep)', margin: '.3rem 0 1.25rem' }}>Choose your service</h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
            {catalog.map((svc) => {
              const isSelected = serviceId === svc.id;
              return (
                <label
                  key={svc.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    border: `1.5px solid ${isSelected ? 'var(--pink)' : 'var(--border)'}`,
                    borderRadius: 16,
                    background: isSelected ? '#fff0f5' : '#fff',
                    minHeight: 44,
                  }}
                >
                  <input
                    type="radio"
                    name="service"
                    checked={isSelected}
                    onChange={() => {
                      setServiceId(svc.id);
                      setDesignId(null);
                    }}
                    style={{ marginInlineEnd: '.8rem', width: 20, height: 20, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '.95rem', fontWeight: 600 }}>{locale === 'ar' ? svc.name_ar : svc.name_en}</h3>
                    {svc.base_minutes > 0 && (
                      <p className="sans" style={{ fontSize: '.7rem', color: 'var(--sub)', marginTop: '.2rem' }}>
                        {formatDuration(svc.base_minutes)}
                      </p>
                    )}
                  </div>
                  <div className="sans" style={{ fontWeight: 700, color: 'var(--deep)', fontSize: '.85rem', flexShrink: 0 }}>
                    {svc.base_price_egp} EGP
                  </div>
                </label>
              );
            })}
          </div>

          {requiresDesign && (
            <>
              <div style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 .8rem' }}>Pick a design</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                {designOptions.map((d) => {
                  const isSelected = designId === d.id;
                  return (
                    <label
                      key={d.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '.85rem 1rem',
                        border: `1.5px solid ${isSelected ? 'var(--pink)' : 'var(--border)'}`,
                        borderRadius: 14,
                        background: isSelected ? '#fff0f5' : '#fff',
                        minHeight: 44,
                      }}
                    >
                      <input
                        type="radio"
                        name="design"
                        checked={isSelected}
                        onChange={() => setDesignId(d.id)}
                        style={{ marginInlineEnd: '.8rem', width: 18, height: 18, flexShrink: 0 }}
                      />
                      <span style={{ flex: 1, fontSize: '.88rem' }}>{locale === 'ar' ? d.name_ar : d.name_en}</span>
                      <span className="sans" style={{ color: 'var(--deep)', fontWeight: 700, fontSize: '.8rem' }}>
                        +{d.price_egp} EGP
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          <div className="card" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="sans" style={{ fontSize: '.65rem', textTransform: 'uppercase', color: 'var(--sub)' }}>
                {t('duration')}
              </div>
              <div style={{ fontWeight: 700 }}>{formatDuration(totalMinutes)}</div>
            </div>
            <div>
              <div className="sans" style={{ fontSize: '.65rem', textTransform: 'uppercase', color: 'var(--sub)' }}>
                {t('total')}
              </div>
              <div style={{ fontWeight: 700, color: 'var(--deep)' }}>{totalPriceEgp} EGP</div>
            </div>
          </div>

          <button className="btn btn-primary btn-block" style={{ marginTop: '1.3rem' }} disabled={!canContinueFromService} onClick={() => setStep('slot')}>
            {t('continue')} →
          </button>
        </>
      )}

      {step === 'slot' && (
        <>
          <p className="sans" style={{ fontSize: '.68rem', color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {t('step2')}
          </p>
          <h1 style={{ fontSize: '1.4rem', color: 'var(--deep)', margin: '.3rem 0 1.25rem' }}>
            {locale === 'ar' ? service.name_ar : service.name_en}
          </h1>
          <p className="sans" style={{ fontSize: '.8rem', color: 'var(--sub)', marginBottom: '1.2rem' }}>
            {formatDuration(totalMinutes)} needed · {totalPriceEgp} EGP total
          </p>

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
              <p className="sans" style={{ fontSize: '.7rem', textTransform: 'uppercase', color: 'var(--sub)', margin: '1.2rem 0 .6rem' }}>
                Open times — {selectedDate}
              </p>
              {loadingTimes ? (
                <p className="sans" style={{ fontSize: '.78rem', color: 'var(--sub)' }}>
                  Loading…
                </p>
              ) : openTimes.length === 0 ? (
                <p className="sans" style={{ fontSize: '.78rem', color: 'var(--sub)' }}>
                  No open times this day.
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem' }}>
                  {openTimes.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className="sans"
                      style={{
                        fontSize: '.78rem',
                        padding: '.6rem 1rem',
                        minHeight: 44,
                        borderRadius: 20,
                        border: `1px solid ${selectedTime === time ? 'var(--pink)' : 'var(--border)'}`,
                        background: selectedTime === time ? 'var(--pink)' : '#fff',
                        color: selectedTime === time ? '#fff' : 'var(--text)',
                      }}
                    >
                      {formatTime24to12(time)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <button className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }} disabled={!selectedDate || !selectedTime} onClick={() => setStep('details')}>
            {t('continue')} →
          </button>
        </>
      )}

      {step === 'details' && (
        <>
          <p className="sans" style={{ fontSize: '.68rem', color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {t('step3')}
          </p>
          <h1 style={{ fontSize: '1.4rem', color: 'var(--deep)', margin: '.3rem 0 1.25rem' }}>{t('notes')}</h1>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
            style={{ width: '100%', minHeight: 90, marginBottom: '1.25rem' }}
          />

          <div className="card" style={{ background: '#fdf3f6', border: 'none', marginBottom: '1.25rem' }}>
            <p className="sans" style={{ fontSize: '.7rem', color: 'var(--sub)' }}>
              {t('rescheduleWindowNotice')}
            </p>
          </div>

          {submitError && (
            <p className="sans" style={{ fontSize: '.75rem', color: 'var(--danger)', marginBottom: '1rem' }}>
              {submitError}
            </p>
          )}

          <button className="btn btn-primary btn-block" disabled={submitting} onClick={handleSubmit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
            {submitting && <NailLoader size="mini" />}
            {submitting ? 'Sending…' : `${t('requestBooking')} →`}
          </button>
        </>
      )}
    </div>
  );
}
