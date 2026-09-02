import { Booking, Client } from './types';

// In-memory placeholder data, shaped like the Supabase schema. Swap each
// function body for a real cached Supabase call once connected (see
// "Egress & caching strategy" in DEPLOY.md) — callers don't need to change.

export const MOCK_CLIENT: Client = {
  id: 'client-1',
  name: 'Jasmine M.',
  email: 'jasmine.m@email.com',
  loyaltyPoints: 8,
  adminPrivateNotes: 'Always books gel, tips well, prefers afternoon slots.',
};

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'BK-2941',
    clientId: 'client-1',
    clientName: 'Jasmine M.',
    status: 'pending',
    scheduledStart: '2026-09-04T14:30:00',
    scheduledEnd: '2026-09-04T16:30:00',
    serviceId: 'gel-manicure',
    designId: 'french',
    wasServiceCompleted: null,
    wasDesignCompleted: null,
    totalPriceEgp: 800,
    isLoyaltyFree: false,
    healthNotes: 'Sensitive to acetone-based removers. Small cut healing on left thumb cuticle.',
    inspoImageUrls: [],
    createdAt: '2026-09-02T10:00:00',
  },
  {
    id: 'BK-2938',
    clientId: 'client-1',
    clientName: 'Jasmine M.',
    status: 'confirmed',
    scheduledStart: '2026-09-12T11:00:00',
    scheduledEnd: '2026-09-12T15:00:00',
    serviceId: 'hard-gel-new-set-complex',
    designId: 'complex-design',
    wasServiceCompleted: null,
    wasDesignCompleted: null,
    totalPriceEgp: 1500,
    isLoyaltyFree: false,
    healthNotes: '',
    inspoImageUrls: [],
    createdAt: '2026-08-28T09:00:00',
  },
];

export function getUpcomingBookings(clientId: string): Booking[] {
  return MOCK_BOOKINGS.filter((b) => b.clientId === clientId && ['pending', 'confirmed', 'needs_reschedule'].includes(b.status));
}

export function getPendingBookingsForOwner(): Booking[] {
  return MOCK_BOOKINGS.filter((b) => b.status === 'pending');
}

export function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60);
}

export function canClientRescheduleOrCancel(booking: Booking): boolean {
  return hoursUntil(booking.scheduledStart) > 24;
}
