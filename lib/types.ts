export type DesignTier = 'none' | 'simple' | 'complex';

export interface Service {
  id: string;
  nameEn: string;
  nameAr: string;
  basePriceEgp: number;
  baseMinutes: number;
  designTier: DesignTier;
}

export interface DesignOption {
  id: string;
  nameEn: string;
  nameAr: string;
  priceEgp: number;
  tier: Exclude<DesignTier, 'none'>;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'needs_reschedule'
  | 'declined'
  | 'cancelled'
  | 'done';

export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  status: BookingStatus;
  scheduledStart: string; // ISO
  scheduledEnd: string; // ISO, derived from the chosen service's minutes
  serviceId: string;
  designId: string | null;
  wasServiceCompleted: boolean | null; // set by owner at session close
  wasDesignCompleted: boolean | null;
  totalPriceEgp: number;
  isLoyaltyFree: boolean;
  healthNotes: string;
  inspoImageUrls: string[];
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  loyaltyPoints: number;
  adminPrivateNotes: string;
}

export interface AvailabilitySlot {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  isBlocked: boolean;
}
