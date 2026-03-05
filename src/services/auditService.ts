import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id?: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: any;
  new_values?: any;
  details?: any;
  category?: string;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface AuditLog extends AuditLogEntry {}

async function getOrgIdsForUser(userId: string): Promise<{ wholesaler_id?: string; retailer_id?: string }> {
  // First check if user is staff - if so, use employer's id for org scoping
  const { data: staffLink } = await supabase
    .from('staff_members')
    .select('pharmacy_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  const orgId = staffLink?.pharmacy_id || userId;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', orgId)
    .single();
  if (!profile) return {};
  if (profile.role === 'wholesale') {
    return { wholesaler_id: profile.id };
  }
  if (profile.role === 'retail') {
    return { retailer_id: profile.id };
  }
  return {};
}

class AuditService {
  private async createAuditLog(entry: Omit<AuditLogEntry, 'id' | 'user_id' | 'created_at'>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const orgIds = await getOrgIdsForUser(user.id);
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          ...entry,
          user_id: user.id,
          ...orgIds
        });
      if (error) {
        console.error('Error creating audit log:', error);
      }
    } catch (error) {
      console.error('AuditService error:', error);
    }
  }

  async logAction(action: string, resourceType: string, resourceId?: string, details?: any) {
    await this.createAuditLog({
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      category: 'general'
    });
  }

  async logLogin() {
    await this.createAuditLog({
      action: 'LOGIN',
      resource_type: 'user',
      category: 'authentication',
      details: { message: 'User logged in' }
    });
  }

  async logLogout() {
    await this.createAuditLog({
      action: 'LOGOUT',
      resource_type: 'user',
      category: 'authentication',
      details: { message: 'User logged out' }
    });
  }

  async logSettingsUpdate(oldValues: any, newValues: any) {
    await this.createAuditLog({
      action: 'UPDATE',
      resource_type: 'settings',
      old_values: oldValues,
      new_values: newValues,
      category: 'settings',
      details: { message: 'User settings updated' }
    });
  }

  async logProductCreate(productId: string, productData: any) {
    await this.createAuditLog({
      action: 'CREATE',
      resource_type: 'product',
      resource_id: productId,
      new_values: productData,
      category: 'inventory',
      details: { message: `Product ${productData.name} created` }
    });
  }

  async logProductUpdate(productId: string, oldData: any, newData: any) {
    await this.createAuditLog({
      action: 'UPDATE',
      resource_type: 'product',
      resource_id: productId,
      old_values: oldData,
      new_values: newData,
      category: 'inventory',
      details: { message: `Product ${newData.name} updated` }
    });
  }

  async logProductDelete(productId: string, productData: any) {
    await this.createAuditLog({
      action: 'DELETE',
      resource_type: 'product',
      resource_id: productId,
      old_values: productData,
      category: 'inventory',
      details: { message: `Product ${productData.name} deleted` }
    });
  }

  async logInventoryMovement(productId: string, movementData: any) {
    await this.createAuditLog({
      action: 'INVENTORY_MOVEMENT',
      resource_type: 'product',
      resource_id: productId,
      new_values: movementData,
      category: 'inventory',
      details: { message: `Inventory movement recorded for product ${productId}` }
    });
  }

  async logStockUpdate(productId: string, oldStock: number, newStock: number, reason?: string) {
    await this.createAuditLog({
      action: 'STOCK_UPDATE',
      resource_type: 'product',
      resource_id: productId,
      old_values: { stock: oldStock },
      new_values: { stock: newStock },
      category: 'inventory',
      details: { 
        message: `Stock updated from ${oldStock} to ${newStock}`,
        reason: reason || 'Manual adjustment'
      }
    });
  }

  async getUserActivity(userId?: string) {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user activity:', error);
      throw error;
    }

    return data || [];
  }

  async getAuditLogs(resourceType?: string, resourceId?: string) {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    if (resourceId) {
      query = query.eq('resource_id', resourceId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }

    return data || [];
  }

  async getOrgActivity(wholesalerId?: string, retailerId?: string) {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (wholesalerId) {
      query = query.eq('wholesaler_id', wholesalerId);
    }
    if (retailerId) {
      query = query.eq('retailer_id', retailerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching org activity:', error);
      throw error;
    }

    return data || [];
  }
}

export const auditService = new AuditService();
