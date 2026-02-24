import { supabase } from '@/integrations/supabase/client';
import { comprehensiveNotificationService } from './comprehensiveNotificationService';

export interface PrepPepService {
  id: string;
  lab_id: string;
  service_type: 'prep' | 'pep' | 'hiv_self_test' | 'circumcision';
  is_available: boolean;
  consultation_required: boolean;
  stock_status: 'available' | 'unavailable';
  price: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface PrepPepBooking {
  id: string;
  user_id: string;
  lab_id: string;
  service_type: 'prep' | 'pep' | 'hiv_self_test' | 'circumcision';
  status: 'pending' | 'confirmed' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  payment_method: string;
  payment_status: 'unpaid' | 'paid' | 'partial';
  total_amount: number;
  booking_date: string;
  booking_time?: string;
  consultation_notes?: string;
  ai_consultation_done: boolean;
  patient_name: string;
  patient_phone?: string;
  patient_age?: number;
  patient_gender?: string;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
  // Joined
  lab?: { business_name?: string; name?: string; phone?: string; address?: string };
}

class PrepPepServiceAPI {
  // ===== LAB MANAGEMENT =====
  async getMyServices(): Promise<PrepPepService[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('prep_pep_services')
      .select('*')
      .eq('lab_id', user.id);

    if (error) throw error;
    return (data || []) as PrepPepService[];
  }

  async upsertService(service: Partial<PrepPepService> & { service_type: string }): Promise<PrepPepService> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('prep_pep_services')
      .upsert({
        lab_id: user.id,
        service_type: service.service_type,
        is_available: service.is_available ?? true,
        consultation_required: service.consultation_required ?? true,
        stock_status: service.stock_status ?? 'available',
        price: service.price ?? 0,
        description: service.description || null,
      }, { onConflict: 'lab_id,service_type' })
      .select()
      .single();

    if (error) throw error;
    return data as PrepPepService;
  }

  // ===== BROWSING (INDIVIDUAL) =====
  async getAvailableServices(): Promise<(PrepPepService & { lab: any })[]> {
    // First try dedicated prep_pep_services table
    const { data, error } = await supabase
      .from('prep_pep_services')
      .select('*, lab:profiles!prep_pep_services_lab_id_fkey(id, name, pharmacy_name, business_name, phone, address, region, city, latitude, longitude)')
      .eq('is_available', true)
      .eq('stock_status', 'available');

    if (error) throw error;
    
    // If we have services, return them
    if (data && data.length > 0) {
      return data as any[];
    }
    
    // Fallback: create virtual services from pharmacies with self_test_available
    const { data: pharmacies, error: phError } = await supabase
      .from('profiles')
      .select('id, name, pharmacy_name, business_name, phone, address, region, city, latitude, longitude')
      .eq('role', 'retail')
      .eq('self_test_available', true)
      .eq('is_approved', true);
    
    if (phError) throw phError;
    
    // Map pharmacies to virtual PrEP/PEP service entries
    return (pharmacies || []).map((p: any) => ({
      id: `virtual-${p.id}`,
      lab_id: p.id,
      service_type: 'hiv_self_test' as const,
      is_available: true,
      consultation_required: false,
      stock_status: 'available' as const,
      price: 15000,
      description: 'HIV Self-Test Kit available for discreet delivery',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lab: p,
    }));
  }

  // ===== BOOKINGS =====
  async createBooking(booking: Omit<PrepPepBooking, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'status' | 'payment_status' | 'ai_consultation_done'>): Promise<PrepPepBooking> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('prep_pep_bookings')
      .insert({
        ...booking,
        user_id: user.id,
        status: 'pending',
        payment_status: 'unpaid',
        payment_method: booking.payment_method || 'cod',
      })
      .select()
      .single();

    if (error) throw error;

    // Send notifications
    try {
      const { data: userData } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', user.id)
        .single();

      const serviceLabel = booking.service_type === 'prep' ? 'PrEP' : booking.service_type === 'pep' ? 'PEP' : booking.service_type === 'hiv_self_test' ? 'HIV Self-Test Kit' : 'Circumcision';

      if (userData?.email) {
        await comprehensiveNotificationService.notifyLabTestBooked(
          user.id, userData.email, booking.patient_name, serviceLabel, booking.booking_date, 'Health Facility'
        );
      }

      // Notify the lab
      const { data: labData } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', booking.lab_id)
        .single();

      if (labData?.email) {
        await comprehensiveNotificationService.notifyLabNewAppointment(
          booking.lab_id, labData.email, booking.patient_name, serviceLabel, booking.booking_date
        );
      }
    } catch (e) {
      console.error('Notification error:', e);
    }

    return data as PrepPepBooking;
  }

  async getMyBookings(): Promise<PrepPepBooking[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('prep_pep_bookings')
      .select('*, lab:profiles!prep_pep_bookings_lab_id_fkey(name, business_name, phone, address)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as PrepPepBooking[];
  }

  async getLabBookings(): Promise<PrepPepBooking[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('prep_pep_bookings')
      .select('*')
      .eq('lab_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as PrepPepBooking[];
  }

  async updateBookingStatus(id: string, status: PrepPepBooking['status'], paymentStatus?: PrepPepBooking['payment_status']): Promise<PrepPepBooking> {
    const updateData: any = { status };
    if (paymentStatus) updateData.payment_status = paymentStatus;

    const { data, error } = await supabase
      .from('prep_pep_bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Notify user of status change
    try {
      const booking = data as PrepPepBooking;
      const { data: userData } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', booking.user_id)
        .single();

      const serviceLabel = booking.service_type === 'prep' ? 'PrEP' : booking.service_type === 'pep' ? 'PEP' : booking.service_type;

      if (userData?.email) {
        await comprehensiveNotificationService.notifyAppointmentStatusChange(
          booking.user_id, userData.email, serviceLabel, booking.booking_date, status
        );
      }
    } catch (e) {
      console.error('Notification error:', e);
    }

    return data as PrepPepBooking;
  }
}

export const prepPepService = new PrepPepServiceAPI();
