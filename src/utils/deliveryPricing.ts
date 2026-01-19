// Delivery pricing tiers for Tanzania (TZS)
// Profit split: 75% rider, 25% platform

export interface DeliveryPriceTier {
  minKm: number;
  maxKm: number;
  price: number;
}

export const DELIVERY_PRICE_TIERS: DeliveryPriceTier[] = [
  { minKm: 0, maxKm: 0.5, price: 1000 },
  { minKm: 0.5, maxKm: 2, price: 1000 },
  { minKm: 2, maxKm: 4, price: 1500 },
  { minKm: 4, maxKm: 6, price: 2000 },
  { minKm: 6, maxKm: 8, price: 2500 },
  { minKm: 8, maxKm: 10, price: 3000 },
  { minKm: 10, maxKm: 15, price: 4000 },
  { minKm: 15, maxKm: 20, price: 5000 },
];

export const MAX_DELIVERY_DISTANCE_KM = 20;

// Profit margins
export const RIDER_PROFIT_PERCENTAGE = 0.75; // 75%
export const PLATFORM_PROFIT_PERCENTAGE = 0.25; // 25%

/**
 * Calculate delivery fee based on distance in kilometers
 */
export function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= 0) return DELIVERY_PRICE_TIERS[0].price;
  if (distanceKm > MAX_DELIVERY_DISTANCE_KM) {
    // Beyond max distance - return highest tier price
    return DELIVERY_PRICE_TIERS[DELIVERY_PRICE_TIERS.length - 1].price;
  }

  const tier = DELIVERY_PRICE_TIERS.find(
    (t) => distanceKm > t.minKm && distanceKm <= t.maxKm
  );

  return tier?.price ?? DELIVERY_PRICE_TIERS[0].price;
}

/**
 * Calculate rider's share of the delivery fee
 */
export function calculateRiderShare(deliveryFee: number): number {
  return Math.round(deliveryFee * RIDER_PROFIT_PERCENTAGE);
}

/**
 * Calculate platform's share of the delivery fee
 */
export function calculatePlatformShare(deliveryFee: number): number {
  return Math.round(deliveryFee * PLATFORM_PROFIT_PERCENTAGE);
}

/**
 * Get delivery fee breakdown
 */
export function getDeliveryFeeBreakdown(distanceKm: number) {
  const totalFee = calculateDeliveryFee(distanceKm);
  return {
    totalFee,
    riderShare: calculateRiderShare(totalFee),
    platformShare: calculatePlatformShare(totalFee),
    distanceKm: Math.round(distanceKm * 100) / 100,
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format price in TZS
 */
export function formatTZS(amount: number): string {
  return `TZS ${amount.toLocaleString()}`;
}
