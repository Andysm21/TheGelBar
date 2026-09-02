'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { SERVICES_CATALOG, designOptionsForTier, summarizeBooking } from '@/lib/services-catalog';
import Calendar, { DayAvailability } from '@/components/Calendar/Calendar';
import { formatDuration } from '@/lib/format';

const STEPS = ['service', 'slot', 'details'] as const;
type Step = (typeof STEPS)[number];

// TODO: replace with a real Supabase query for the given month once
// connected — one query per month view, not per day (avoids N+1).
const MOCK_AVAILABILITY: DayAvailability[] = [
  { date: '2026-09-01', openCount: 6 },
  { date: '2026-09-02', openCount: 4 },
  { date: '2026-09-03', full: true },
  { date: '2026-09-04', openCount: 3 },
  { date: '2026-09-05', openCount: 5 },
];

export default function BookPage() {
  const t = useTranslations('booking');
  const { locale } = useParams<{ locale: string }>();

  const [step, setStep] = useState<Step>('service');
  const [serviceId, setServiceId] = useState<string>('gel-manicure');
  const [designId, setDesignId] = useState<string | null>(null);
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(8); // September (0-indexed)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const service = SERVICES_CATALOG.find((s) => s.id === serviceId)!;
  const designOptions = designOptionsForTier(service.designTier);
  const { totalMinutes, totalPriceEgp } = useMemo(
    () => summarizeBooking(serviceId, designId),
    [serviceId, designId]
  );

  const requiresDesign = service.designTier !== 'none';
  const canContinueFromService = !requiresDesign || !!designId;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  function selectService(id: string) {
    setServiceId(id);
    setDesignId(null); // reset design when base service changes
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
          <h3 style={{ fontSize: '1.05rem' }}>{locale === 'ar' ? service.nameAr : service.nameEn}</h3>
          <p className="sans" style={{ fontSize: '.8rem', color: 'var(--sub)', marginTop: '.4rem' }}>
            {selectedDate} · {selectedTime} · {formatDuration(totalMinutes)} · {totalPriceEgp} EGP
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
            {SERVICES_CATALOG.map((svc) => {
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
                    onChange={() => selectService(svc.id)}
                    style={{ marginInlineEnd: '.8rem', width: 20, height: 20, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '.95rem', fontWeight: 600 }}>{locale === 'ar' ? svc.nameAr : svc.nameEn}</h3>
                    <p className="sans" style={{ fontSize: '.7rem', color: 'var(--sub)', marginTop: '.2rem' }}>
                      {formatDuration(svc.baseMinutes)}
                    </p>
                  </div>
                  <div className="sans" style={{ fontWeight: 700, color: 'var(--deep)', fontSize: '.85rem', flexShrink: 0 }}>
                    {svc.basePriceEgp} EGP
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
                      <span style={{ flex: 1, fontSize: '.88rem' }}>{locale === 'ar' ? d.nameAr : d.nameEn}</span>
                      <span className="sans" style={{ color: 'var(--deep)', fontWeight: 700, fontSize: '.8rem' }}>+{d.priceEgp} EGP</span>
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
              <div style={{ fontWeight: 700 }}>
                {formatDuration(totalMinutes)}
              </div>
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
          <h1 style={{ fontSize: '1.4rem', color: 'var(--deep)', margin: '.3rem 0 1.25rem' }}>Pick a date</h1>

          <Calendar
            year={calYear}
            month={calMonth}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setSelectedTime(null);
            }}
            onMonthChange={(y, m) => {
              setCalYear(y);
              setCalMonth(m);
            }}
            availability={MOCK_AVAILABILITY}
          />

          {selectedDate && (
            <>
              <p className="sans" style={{ fontSize: '.7rem', textTransform: 'uppercase', color: 'var(--sub)', margin: '1.2rem 0 .6rem' }}>
                Open times — {selectedDate}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem' }}>
                {/* TODO: real query filtered by selectedDate + service duration, one call */}
                {['10:00 AM', '11:15 AM', '2:30 PM', '5:00 PM'].map((time) => (
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
                    {time}
                  </button>
                ))}
              </div>
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
          <h1 style={{ fontSize: '1.4rem', color: 'var(--deep)', margin: '.3rem 0 1.25rem' }}>{t('uploadInspo')}</h1>

          <div
            className="sans"
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 16,
              padding: '2rem 1rem',
              textAlign: 'center',
              color: 'var(--sub)',
              fontSize: '.8rem',
              marginBottom: '1.25rem',
            }}
          >
            📎 Drag photos here or tap to upload
          </div>

          <label className="sans" style={{ display: 'block', fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.4rem' }}>
            {t('notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
            style={{
              width: '100%',
              minHeight: 90,
              padding: '.75rem .9rem',
              border: '1px solid var(--border)',
              borderRadius: 12,
              fontFamily: 'Arial',
              fontSize: '.85rem',
              marginBottom: '1.25rem',
            }}
          />

          <div className="card" style={{ background: '#fdf3f6', border: 'none', marginBottom: '1.25rem' }}>
            <p className="sans" style={{ fontSize: '.7rem', color: 'var(--sub)' }}>
              {t('rescheduleWindowNotice')}
            </p>
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              // TODO: single Supabase insert into `bookings` (service_id,
              // design_id already resolved client-side, so no extra
              // lookups needed) + .ics generation + tentative Google
              // Calendar event.
              setSubmitted(true);
            }}
          >
            {t('requestBooking')} →
          </button>
        </>
      )}
    </div>
  );
}
