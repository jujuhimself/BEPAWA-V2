import { supabase } from '@/integrations/supabase/client';

export interface Prescription {
  id: string;
  user_id: string;
  patient_name: string;
  patient_phone?: string;
  doctor_name: string;
  doctor_license?: string;
  prescription_date: string;
  diagnosis?: string;
  instructions?: string;
  status: string;
  pharmacy_id?: string;
  verified_by?: string;
  verified_at?: string;
  dispensed_by?: string;
  dispensed_at?: string;
  created_at: string;
  updated_at: string;
  file_path: string | null;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unit: string;
  special_instructions?: string;
  product_id?: string;
  dispensed_quantity: number;
  created_at: string;
}

class PrescriptionService {
  async getPrescriptions(): Promise<Prescription[]> {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching prescriptions:', error);
      throw error;
    }

    return (data || []).map(prescription => ({
      ...prescription,
      file_path: prescription.file_path ?? null,
    }));
  }

  async createPrescription(prescription: Omit<Prescription, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Prescription> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('prescriptions')
      .insert({
        ...prescription,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating prescription:', error);
      throw error;
    }

    return {
      ...data,
      file_path: data.file_path ?? null,
    };
  }

  async getPrescriptionItems(prescriptionId: string): Promise<PrescriptionItem[]> {
    const { data, error } = await supabase
      .from('prescription_items')
      .select('*')
      .eq('prescription_id', prescriptionId)
      .order('created_at');

    if (error) {
      console.error('Error fetching prescription items:', error);
      throw error;
    }

    return data || [];
  }

  async createPrescriptionItem(item: Omit<PrescriptionItem, 'id' | 'created_at'>): Promise<PrescriptionItem> {
    const { data, error } = await supabase
      .from('prescription_items')
      .insert(item)
      .select()
      .single();

    if (error) {
      console.error('Error creating prescription item:', error);
      throw error;
    }

    return data;
  }

  async updatePrescriptionStatus(id: string, status: string): Promise<Prescription> {
    const { data, error } = await supabase
      .from('prescriptions')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating prescription status:', error);
      throw error;
    }

    return {
      ...data,
      file_path: data.file_path ?? null,
    };
  }

  async getPrescriptionsForPharmacy(pharmacyId: string): Promise<Prescription[]> {
    // Fetch prescriptions assigned to this pharmacy
    const { data: assigned, error: assignedError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .order('created_at', { ascending: false });
    if (assignedError) {
      console.error('Error fetching pharmacy prescriptions:', assignedError);
      throw assignedError;
    }
    // Fetch prescriptions shared via shared_prescriptions
    const { data: sharedLinks, error: sharedError } = await supabase
      .from('shared_prescriptions')
      .select('prescription_id')
      .eq('pharmacy_id', pharmacyId);
    if (sharedError) {
      console.error('Error fetching shared prescriptions:', sharedError);
      throw sharedError;
    }
    let shared: Prescription[] = [];
    if (sharedLinks && sharedLinks.length > 0) {
      const sharedIds = sharedLinks.map((row: any) => row.prescription_id);
      const { data: sharedPrescriptions, error: sharedPrescError } = await supabase
        .from('prescriptions')
        .select('*')
        .in('id', sharedIds);
      if (sharedPrescError) {
        console.error('Error fetching shared prescription details:', sharedPrescError);
        throw sharedPrescError;
      }
      shared = (sharedPrescriptions || []).map(p => ({
        ...p,
        file_path: p.file_path ?? null,
      })) as Prescription[];
    }
    // Map assigned
    const assignedTyped = (assigned || []).map(prescription => ({
      ...prescription,
      file_path: prescription.file_path ?? null,
    })) as Prescription[];
    
    // Combine and deduplicate by prescription id
    const all = [...assignedTyped, ...shared];
    const validStatuses = ['pending', 'verified', 'dispensed', 'completed', 'cancelled'];
    const result = Object.values(
      all.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {} as Record<string, Prescription>)
    ).filter((prescription) => validStatuses.includes(prescription.status));
    
    return result;
  }
}

export const prescriptionService = new PrescriptionService();
