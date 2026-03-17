import { supabase } from '@/integrations/supabase/client';

/**
 * Shared service to fetch pharmacies with staff exclusion.
 * Used by both PharmacyDirectory and PharmacyFinder to prevent drift.
 */

export interface PharmacyProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  operatingHours: string;
  latitude?: number;
  longitude?: number;
  profilePhotoUrl?: string;
}

/**
 * Fetches active staff user IDs via the security-definer RPC,
 * bypassing RLS on staff_members.
 */
export async function getActiveStaffIds(): Promise<string[]> {
  const { data: staffRows } = await (supabase.rpc('get_active_staff_user_ids' as any) as any);
  return (staffRows || [])
    .map((row: any) => (typeof row === 'string' ? row : row?.get_active_staff_user_ids || row?.user_id))
    .filter(Boolean);
}

/**
 * Fetches approved retail pharmacies, excluding staff accounts.
 */
export async function fetchPharmacyProfiles(): Promise<PharmacyProfile[]> {
  const staffIds = await getActiveStaffIds();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, business_name, pharmacy_name, region, city, phone, address, is_approved, operating_hours, latitude, longitude, profile_photo_url')
    .eq('role', 'retail')
    .eq('is_approved', true)
    .not('pharmacy_name', 'is', null)
    .neq('pharmacy_name', '')
    .order('pharmacy_name');

  if (error) throw error;

  // Exclude staff profiles
  const filtered = (data || []).filter((p: any) => !staffIds.includes(p.id));

  return filtered.map((p: any) => ({
    id: p.id,
    name: p.pharmacy_name || p.business_name || p.name || 'Pharmacy',
    address: p.address || [p.city, p.region].filter(Boolean).join(', ') || 'Location not set',
    phone: p.phone || 'N/A',
    operatingHours: p.operating_hours || '8:00 AM - 8:00 PM',
    latitude: p.latitude,
    longitude: p.longitude,
    profilePhotoUrl: p.profile_photo_url || undefined,
  }));
}
