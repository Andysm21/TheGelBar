import { Service, DesignOption, DesignTier } from './types';

// Real prices/durations from The Gel Bar's final price list (confirmed).
// Each booking picks exactly ONE base service. If that service's design
// tier is 'simple' or 'complex', the client also picks exactly one design
// option from that tier (adds price only — duration is already baked into
// the base service's minutes for that tier).
export const SERVICES_CATALOG: Service[] = [
  { id: 'gel-manicure', nameEn: 'Gel manicure', nameAr: 'مانيكير جل', basePriceEgp: 650, baseMinutes: 120, designTier: 'simple' },
  { id: 'hard-gel-overlay', nameEn: 'Hard gel overlay', nameAr: 'هارد جل أوفرلاي', basePriceEgp: 850, baseMinutes: 120, designTier: 'simple' },
  { id: 'hard-gel-new-set-simple', nameEn: 'Hard gel new set — simple design', nameAr: 'طقم هارد جل جديد - تصميم بسيط', basePriceEgp: 1200, baseMinutes: 180, designTier: 'simple' },
  { id: 'hard-gel-new-set-complex', nameEn: 'Hard gel new set — complex design', nameAr: 'طقم هارد جل جديد - تصميم معقد', basePriceEgp: 1200, baseMinutes: 240, designTier: 'complex' },
  { id: 'removal-only', nameEn: 'Removal only', nameAr: 'إزالة فقط', basePriceEgp: 150, baseMinutes: 45, designTier: 'none' },
  { id: 'false-nails-simple', nameEn: 'False nails — simple design', nameAr: 'أظافر صناعية - تصميم بسيط', basePriceEgp: 550, baseMinutes: 90, designTier: 'simple' },
  { id: 'false-nails-complex', nameEn: 'False nails — complex design', nameAr: 'أظافر صناعية - تصميم معقد', basePriceEgp: 550, baseMinutes: 150, designTier: 'complex' },
  { id: 'nail-fix-one', nameEn: 'Fixing one nail', nameAr: 'إصلاح ظفر واحد', basePriceEgp: 50, baseMinutes: 20, designTier: 'none' },
];

export const DESIGN_OPTIONS: DesignOption[] = [
  { id: 'chrome-cateye-ombre', nameEn: 'Chrome / cat-eye / ombré', nameAr: 'كروم / كات آي / أومبريه', priceEgp: 100, tier: 'simple' },
  { id: 'french', nameEn: 'French', nameAr: 'فرنش', priceEgp: 150, tier: 'simple' },
  { id: 'simple-design', nameEn: 'Simple design', nameAr: 'تصميم بسيط', priceEgp: 150, tier: 'simple' },
  { id: 'complex-design', nameEn: 'Complex design', nameAr: 'تصميم معقد', priceEgp: 300, tier: 'complex' },
];

export function getService(id: string): Service | undefined {
  return SERVICES_CATALOG.find((s) => s.id === id);
}

export function getDesignOption(id: string): DesignOption | undefined {
  return DESIGN_OPTIONS.find((d) => d.id === id);
}

export function designOptionsForTier(tier: DesignTier): DesignOption[] {
  if (tier === 'none') return [];
  return DESIGN_OPTIONS.filter((d) => d.tier === tier);
}

export function summarizeBooking(serviceId: string, designId: string | null) {
  const service = getService(serviceId);
  const design = designId ? getDesignOption(designId) : undefined;
  const totalMinutes = service?.baseMinutes ?? 0;
  const totalPriceEgp = (service?.basePriceEgp ?? 0) + (design?.priceEgp ?? 0);
  return { service, design, totalMinutes, totalPriceEgp };
}

/**
 * Loyalty rule (confirmed): 1 completed+paid session = 1 point. The 11th
 * session (i.e. the one taken while the client is sitting at exactly 10
 * points) is free and grants NO point. The point counter then resets —
 * the next session after the free one starts back at 1, not 11.
 */
export function isFreeLoyaltySession(currentPoints: number): boolean {
  return currentPoints === 10;
}

/** Points to store after a session is marked paid. */
export function nextLoyaltyPoints(currentPoints: number): number {
  return isFreeLoyaltySession(currentPoints) ? 0 : currentPoints + 1;
}
