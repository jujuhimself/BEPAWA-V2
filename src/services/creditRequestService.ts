
import { supabase } from '@/integrations/supabase/client';
import { auditService } from '@/services/auditService';

export interface CreditRequest {
  id: string;
  user_id: string;
  wholesaler_id?: string;
  business_name: string;
  requested_amount: number;
  business_type: string;
  monthly_revenue: number;
  years_in_business: number;
  credit_purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  documents: string[];
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;   // now always present, can be null
  review_notes: string | null;  // now always present, can be null
}

export interface CreditAccount {
  id: string;
  user_id: string;
  credit_limit: number;
  current_balance: number;
  available_credit: number;
  interest_rate: number;
  status: 'active' | 'suspended' | 'closed';
  created_at: string;
  updated_at: string;
}

// Helper type guard to check for any object
function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null;
}

// Valid request statuses
const validStatuses = ["pending", "approved", "rejected", "under_review"] as const;

class CreditRequestService {
  async createCreditRequest(
    request: Omit<CreditRequest, 'id' | 'user_id' | 'status' | 'created_at' | 'updated_at' | 'reviewed_by' | 'review_notes'>
  ): Promise<CreditRequest> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('credit_requests')
      .insert({
        ...request,
        user_id: user.id,
        status: 'pending',
        wholesaler_id: request.wholesaler_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating credit request:', error);
      throw error;
    }

    if (!isRecord(data)) {
      throw new Error('No data returned from createCreditRequest');
    }

    // Audit log
    try {
      await auditService.logAction(
        'CREATE_CREDIT_REQUEST',
        'credit_request',
        String(data.id),
        { business_name: data.business_name, requested_amount: data.requested_amount }
      );
    } catch (e) {
      // Audit errors should not block main action.
      console.warn('Audit logging failed:', e);
    }

    // Cast here to CreditRequest (assumes Supabase schema is valid)
    return data as unknown as CreditRequest;
  }

  async getCreditRequests(): Promise<CreditRequest[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('credit_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching credit requests:', error);
      throw error;
    }

    if (!Array.isArray(data)) return [];

    // Only return records with permitted status values and expected properties
    const filtered = data.filter(
      (rec) =>
        isRecord(rec) &&
        typeof rec.status === "string" &&
        validStatuses.includes(rec.status as CreditRequest['status']) &&
        typeof rec.id === "string" &&
        typeof rec.user_id === "string" &&
        typeof rec.business_name === "string" &&
        typeof rec.requested_amount === "number" &&
        typeof rec.business_type === "string" &&
        typeof rec.monthly_revenue === "number" &&
        typeof rec.years_in_business === "number" &&
        typeof rec.credit_purpose === "string" &&
        Array.isArray(rec.documents) &&
        typeof rec.created_at === "string" &&
        typeof rec.updated_at === "string" &&
        // reviewed_by and review_notes can be null or string
        (typeof rec.reviewed_by === "string" || rec.reviewed_by === null) &&
        (typeof rec.review_notes === "string" || rec.review_notes === null)
    );

    return filtered as unknown as CreditRequest[];
  }

  async getCreditRequestsForWholesaler(wholesalerId: string): Promise<CreditRequest[]> {
    const { data, error } = await supabase
      .from('credit_requests')
      .select('*')
      .eq('wholesaler_id', wholesalerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as CreditRequest[];
  }

  async getCreditAccount(): Promise<CreditAccount | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('credit_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching credit account:', error);
      throw error;
    }

    if (!isRecord(data)) {
      return null;
    }

    // Cast - expects data matches CreditAccount
    return data as unknown as CreditAccount;
  }

  async updateCreditRequestStatus(
    id: string, 
    status: CreditRequest['status'], 
    reviewNotes?: string
  ): Promise<CreditRequest> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('credit_requests')
      .update({
        status,
        review_notes: reviewNotes,
        reviewed_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating credit request:', error);
      throw error;
    }

    if (!isRecord(data)) {
      throw new Error('No data returned after status update');
    }

    return data as unknown as CreditRequest;
  }
}

export const creditRequestService = new CreditRequestService();
