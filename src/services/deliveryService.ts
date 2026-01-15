import { supabase } from '@/integrations/supabase/client';
import { comprehensiveNotificationService } from './comprehensiveNotificationService';

// COD Order Statuses for Dodoma Pilot
export const COD_ORDER_STATUSES = {
  PENDING_PHARMACY_CONFIRMATION: 'pending_pharmacy_confirmation',
  PREPARING_ORDER: 'preparing_order',
  AWAITING_RIDER: 'awaiting_rider',
  RIDER_ASSIGNED: 'rider_assigned',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED_AND_PAID: 'delivered_and_paid',
  DELIVERY_FAILED: 'delivery_failed',
  CANCELLED: 'cancelled',
} as const;

export type CODOrderStatus = typeof COD_ORDER_STATUSES[keyof typeof COD_ORDER_STATUSES];

export interface DeliveryAssignment {
  id: string;
  order_id: string;
  rider_id: string;
  pharmacy_id: string;
  status: 'assigned' | 'accepted' | 'picked_up' | 'delivered' | 'failed' | 'cancelled';
  pickup_address?: string;
  delivery_address?: string;
  customer_phone?: string;
  customer_name?: string;
  estimated_delivery_time?: string;
  actual_pickup_time?: string;
  actual_delivery_time?: string;
  delivery_notes?: string;
  failure_reason?: string;
  cash_amount?: number;
  cash_collected: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  order?: any;
  rider?: any;
  pharmacy?: any;
}

export interface StockReservation {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  reserved_at: string;
  released_at?: string;
  status: 'reserved' | 'fulfilled' | 'released';
  created_at: string;
  updated_at: string;
}

class DeliveryService {
  // ==========================================
  // COD ORDER CREATION (For Individuals)
  // ==========================================
  
  async createCODOrder(orderData: {
    user_id: string;
    items: any[];
    total_amount: number;
    delivery_address: string;
    delivery_phone: string;
    delivery_notes?: string;
    pharmacy_id: string;
  }): Promise<any> {
    const orderNumber = this.generateOrderNumber();
    
    // Create the order with COD payment method and pending pharmacy confirmation status
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: orderData.user_id,
        order_number: orderNumber,
        items: orderData.items,
        total_amount: orderData.total_amount,
        status: COD_ORDER_STATUSES.PENDING_PHARMACY_CONFIRMATION,
        payment_status: 'pending',
        payment_method: 'cod', // Cash on Delivery
        order_type: 'retail',
        pharmacy_id: orderData.pharmacy_id,
        delivery_address: orderData.delivery_address,
        delivery_phone: orderData.delivery_phone,
        delivery_notes: orderData.delivery_notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating COD order:', error);
      throw error;
    }

    // Notify the pharmacy about the new order
    const { data: pharmacy } = await supabase
      .from('profiles')
      .select('email, pharmacy_name')
      .eq('id', orderData.pharmacy_id)
      .single();

    // Get customer info for notifications
    const { data: customer } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', orderData.user_id)
      .single();

    if (pharmacy) {
      await comprehensiveNotificationService.notifyPharmacyCODOrder(
        orderData.pharmacy_id,
        pharmacy.email || '',
        orderNumber,
        customer?.name || 'Customer',
        orderData.total_amount
      );
    }

    // Notify customer their order was placed
    if (customer) {
      await comprehensiveNotificationService.notifyCODOrderPlaced(
        orderData.user_id,
        customer.email || '',
        orderNumber,
        orderData.total_amount,
        pharmacy?.pharmacy_name || 'Pharmacy'
      );
    }

    // Log audit
    await this.logAudit('order_created', 'order', order.id, {
      order_number: orderNumber,
      payment_method: 'cod',
      status: COD_ORDER_STATUSES.PENDING_PHARMACY_CONFIRMATION,
    });

    return order;
  }

  // ==========================================
  // PHARMACY ORDER MANAGEMENT
  // ==========================================

  async acceptOrder(orderId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, profiles!orders_user_id_fkey(email)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new Error('Order not found');

    // Reserve stock for the order items
    const itemsData = order.items;
    const items = Array.isArray(itemsData) ? itemsData : JSON.parse(String(itemsData) || '[]');
    await this.reserveStock(orderId, items);

    // Update order status
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: COD_ORDER_STATUSES.PREPARING_ORDER,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) throw error;

    // Log status change
    await supabase.from('order_status_history').insert({
      order_id: orderId,
      status: COD_ORDER_STATUSES.PREPARING_ORDER,
      changed_by: user.id,
      notes: 'Order accepted by pharmacy',
    });

    // Notify customer
    if (order.user_id) {
      const profileData = order.profiles as { email?: string } | { email?: string }[] | null;
      const profileEmail = Array.isArray(profileData) ? profileData[0]?.email : profileData?.email;
      await comprehensiveNotificationService.notifyOrderStatusChange(
        order.user_id,
        profileEmail || '',
        order.order_number,
        COD_ORDER_STATUSES.PENDING_PHARMACY_CONFIRMATION,
        COD_ORDER_STATUSES.PREPARING_ORDER
      );
    }

    await this.logAudit('order_accepted', 'order', orderId, { status: COD_ORDER_STATUSES.PREPARING_ORDER });
  }

  async rejectOrder(orderId: string, reason: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: order } = await supabase
      .from('orders')
      .select('*, profiles!orders_user_id_fkey(email)')
      .eq('id', orderId)
      .single();

    const { error } = await supabase
      .from('orders')
      .update({ 
        status: COD_ORDER_STATUSES.CANCELLED,
        notes: `Rejected by pharmacy: ${reason}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) throw error;

    await supabase.from('order_status_history').insert({
      order_id: orderId,
      status: COD_ORDER_STATUSES.CANCELLED,
      changed_by: user.id,
      notes: `Order rejected: ${reason}`,
    });

    if (order?.user_id) {
      const profileData = order.profiles as { email?: string } | { email?: string }[] | null;
      const profileEmail = Array.isArray(profileData) ? profileData[0]?.email : profileData?.email;
      await comprehensiveNotificationService.notifyOrderStatusChange(
        order.user_id,
        profileEmail || '',
        order.order_number,
        order.status,
        COD_ORDER_STATUSES.CANCELLED
      );
    }

    await this.logAudit('order_rejected', 'order', orderId, { reason });
  }

  async markOrderReady(orderId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('orders')
      .update({ 
        status: COD_ORDER_STATUSES.AWAITING_RIDER,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) throw error;

    await supabase.from('order_status_history').insert({
      order_id: orderId,
      status: COD_ORDER_STATUSES.AWAITING_RIDER,
      changed_by: user.id,
      notes: 'Order ready for pickup',
    });

    await this.logAudit('order_ready', 'order', orderId, { status: COD_ORDER_STATUSES.AWAITING_RIDER });
  }

  // ==========================================
  // RIDER ASSIGNMENT
  // ==========================================

  async requestRider(orderId: string, riderId: string): Promise<DeliveryAssignment> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new Error('Order not found');

    // Get pharmacy details
    const { data: pharmacy } = await supabase
      .from('profiles')
      .select('address, pharmacy_name')
      .eq('id', user.id)
      .single();

    // Create delivery assignment
    const { data: assignment, error } = await supabase
      .from('delivery_assignments')
      .insert({
        order_id: orderId,
        rider_id: riderId,
        pharmacy_id: user.id,
        status: 'assigned',
        pickup_address: pharmacy?.address || '',
        delivery_address: order.delivery_address || '',
        customer_phone: order.delivery_phone || '',
        customer_name: 'Customer',
        cash_amount: order.total_amount,
        cash_collected: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Update order with rider info
    await supabase
      .from('orders')
      .update({ 
        rider_id: riderId,
        status: COD_ORDER_STATUSES.RIDER_ASSIGNED,
        rider_assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    await supabase.from('order_status_history').insert({
      order_id: orderId,
      status: COD_ORDER_STATUSES.RIDER_ASSIGNED,
      changed_by: user.id,
      notes: `Rider assigned`,
    });

    // Notify rider
    const { data: rider } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', riderId)
      .single();

    if (rider) {
      await comprehensiveNotificationService.notifyOrderStatusChange(
        riderId,
        rider.email || '',
        order.order_number,
        'New delivery assignment',
        'assigned'
      );
    }

    await this.logAudit('rider_assigned', 'delivery_assignment', assignment.id, { 
      order_id: orderId, 
      rider_id: riderId 
    });

    return assignment as DeliveryAssignment;
  }

  async getAvailableRiders(): Promise<any[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, phone, address')
      .eq('role', 'delivery')
      .order('name');

    if (error) {
      console.error('Error fetching riders:', error);
      return [];
    }

    return data || [];
  }

  // ==========================================
  // RIDER ACTIONS
  // ==========================================

  async getRiderAssignments(riderId: string): Promise<DeliveryAssignment[]> {
    const { data, error } = await supabase
      .from('delivery_assignments')
      .select(`
        *,
        order:orders(id, order_number, total_amount, items, status, delivery_address, delivery_phone),
        pharmacy:profiles!delivery_assignments_pharmacy_id_fkey(id, pharmacy_name, address, phone)
      `)
      .eq('rider_id', riderId)
      .in('status', ['assigned', 'accepted', 'picked_up'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rider assignments:', error);
      throw error;
    }

    return (data || []) as DeliveryAssignment[];
  }

  async acceptDeliveryAssignment(assignmentId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('delivery_assignments')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .eq('rider_id', user.id);

    if (error) throw error;

    await this.logAudit('delivery_accepted', 'delivery_assignment', assignmentId, {});
  }

  async markPickedUp(assignmentId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: assignment } = await supabase
      .from('delivery_assignments')
      .select('order_id')
      .eq('id', assignmentId)
      .single();

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('delivery_assignments')
      .update({ 
        status: 'picked_up',
        actual_pickup_time: now,
        updated_at: now
      })
      .eq('id', assignmentId)
      .eq('rider_id', user.id);

    if (error) throw error;

    if (assignment?.order_id) {
      await supabase
        .from('orders')
        .update({ 
          status: COD_ORDER_STATUSES.OUT_FOR_DELIVERY,
          picked_up_at: now,
          updated_at: now
        })
        .eq('id', assignment.order_id);

      await supabase.from('order_status_history').insert({
        order_id: assignment.order_id,
        status: COD_ORDER_STATUSES.OUT_FOR_DELIVERY,
        changed_by: user.id,
        notes: 'Order picked up by rider',
      });
    }

    await this.logAudit('order_picked_up', 'delivery_assignment', assignmentId, {});
  }

  async markDeliveredAndPaid(assignmentId: string, cashAmount: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: assignment, error: fetchError } = await supabase
      .from('delivery_assignments')
      .select('order_id, pharmacy_id')
      .eq('id', assignmentId)
      .single();

    if (fetchError || !assignment) throw new Error('Assignment not found');

    const now = new Date().toISOString();

    // Update assignment
    const { error } = await supabase
      .from('delivery_assignments')
      .update({ 
        status: 'delivered',
        actual_delivery_time: now,
        cash_collected: true,
        cash_amount: cashAmount,
        updated_at: now
      })
      .eq('id', assignmentId)
      .eq('rider_id', user.id);

    if (error) throw error;

    // Update order
    await supabase
      .from('orders')
      .update({ 
        status: COD_ORDER_STATUSES.DELIVERED_AND_PAID,
        payment_status: 'paid',
        cash_collected: cashAmount,
        cash_collected_at: now,
        delivered_at: now,
        updated_at: now
      })
      .eq('id', assignment.order_id);

    // Fulfill stock reservations (permanently deduct stock)
    await this.fulfillStock(assignment.order_id);

    // Create POS sale record
    await this.createPOSSaleFromOrder(assignment.order_id, assignment.pharmacy_id);

    await supabase.from('order_status_history').insert({
      order_id: assignment.order_id,
      status: COD_ORDER_STATUSES.DELIVERED_AND_PAID,
      changed_by: user.id,
      notes: `Delivered and cash collected: TZS ${cashAmount}`,
    });

    // Get order details for notification
    const { data: order } = await supabase
      .from('orders')
      .select('*, profiles!orders_user_id_fkey(email)')
      .eq('id', assignment.order_id)
      .single();

    if (order?.user_id) {
      const profileData = order.profiles as { email?: string } | { email?: string }[] | null;
      const profileEmail = Array.isArray(profileData) ? profileData[0]?.email : profileData?.email;
      await comprehensiveNotificationService.notifyOrderStatusChange(
        order.user_id,
        profileEmail || '',
        order.order_number,
        COD_ORDER_STATUSES.OUT_FOR_DELIVERY,
        COD_ORDER_STATUSES.DELIVERED_AND_PAID
      );
    }

    await this.logAudit('order_delivered', 'delivery_assignment', assignmentId, {
      order_id: assignment.order_id,
      cash_collected: cashAmount,
    });
  }

  async markDeliveryFailed(assignmentId: string, reason: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: assignment } = await supabase
      .from('delivery_assignments')
      .select('order_id')
      .eq('id', assignmentId)
      .single();

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('delivery_assignments')
      .update({ 
        status: 'failed',
        failure_reason: reason,
        updated_at: now
      })
      .eq('id', assignmentId)
      .eq('rider_id', user.id);

    if (error) throw error;

    if (assignment?.order_id) {
      await supabase
        .from('orders')
        .update({ 
          status: COD_ORDER_STATUSES.DELIVERY_FAILED,
          updated_at: now
        })
        .eq('id', assignment.order_id);

      // Release reserved stock
      await this.releaseStock(assignment.order_id);

      await supabase.from('order_status_history').insert({
        order_id: assignment.order_id,
        status: COD_ORDER_STATUSES.DELIVERY_FAILED,
        changed_by: user.id,
        notes: `Delivery failed: ${reason}`,
      });
    }

    await this.logAudit('delivery_failed', 'delivery_assignment', assignmentId, { reason });
  }

  // ==========================================
  // STOCK MANAGEMENT
  // ==========================================

  private async reserveStock(orderId: string, items: any[]): Promise<void> {
    const itemsJson = JSON.stringify(items.map(item => ({
      product_id: item.product_id || item.id,
      quantity: item.quantity,
    })));

    const { error } = await supabase.rpc('reserve_order_stock', {
      p_order_id: orderId,
      p_items: itemsJson,
    });

    if (error) {
      console.error('Error reserving stock:', error);
      throw error;
    }
  }

  private async releaseStock(orderId: string): Promise<void> {
    const { error } = await supabase.rpc('release_order_stock', {
      p_order_id: orderId,
    });

    if (error) {
      console.error('Error releasing stock:', error);
      throw error;
    }
  }

  private async fulfillStock(orderId: string): Promise<void> {
    const { error } = await supabase.rpc('fulfill_order_stock', {
      p_order_id: orderId,
    });

    if (error) {
      console.error('Error fulfilling stock:', error);
      throw error;
    }
  }

  // ==========================================
  // POS INTEGRATION
  // ==========================================

  private async createPOSSaleFromOrder(orderId: string, pharmacyId: string): Promise<void> {
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) return;

    const itemsData = order.items;
    const items = Array.isArray(itemsData) ? itemsData : JSON.parse(String(itemsData) || '[]');

    // Create POS sale
    const { data: sale, error: saleError } = await supabase
      .from('pos_sales')
      .insert({
        user_id: pharmacyId,
        total_amount: order.total_amount,
        payment_method: 'cod',
        customer_name: 'COD Customer',
        sale_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (saleError || !sale) {
      console.error('Error creating POS sale:', saleError);
      return;
    }

    // Create sale items
    for (const item of items) {
      await supabase.from('pos_sale_items').insert({
        pos_sale_id: sale.id,
        product_id: item.product_id || item.id,
        quantity: item.quantity,
        unit_price: item.price || item.sell_price,
        total_price: (item.price || item.sell_price) * item.quantity,
      });
    }
  }

  // ==========================================
  // PHARMACY ORDER QUERIES
  // ==========================================

  async getPharmacyCODOrders(pharmacyId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:profiles!orders_user_id_fkey(id, name, phone, address),
        rider:profiles!orders_rider_id_fkey(id, name, phone)
      `)
      .eq('pharmacy_id', pharmacyId)
      .eq('payment_method', 'cod')
      .in('status', [
        COD_ORDER_STATUSES.PENDING_PHARMACY_CONFIRMATION,
        COD_ORDER_STATUSES.PREPARING_ORDER,
        COD_ORDER_STATUSES.AWAITING_RIDER,
        COD_ORDER_STATUSES.RIDER_ASSIGNED,
        COD_ORDER_STATUSES.OUT_FOR_DELIVERY,
      ])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pharmacy COD orders:', error);
      throw error;
    }

    return data || [];
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  private generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = date.getTime().toString().slice(-6);
    return `COD-${dateStr}-${timeStr}`;
  }

  private async logAudit(action: string, resourceType: string, resourceId: string, details: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('audit_logs').insert({
        user_id: user?.id || '',
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
        category: 'delivery',
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }

  // ==========================================
  // STATUS HELPERS
  // ==========================================

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      [COD_ORDER_STATUSES.PENDING_PHARMACY_CONFIRMATION]: 'Pending Confirmation',
      [COD_ORDER_STATUSES.PREPARING_ORDER]: 'Preparing Order',
      [COD_ORDER_STATUSES.AWAITING_RIDER]: 'Ready for Pickup',
      [COD_ORDER_STATUSES.RIDER_ASSIGNED]: 'Rider Assigned',
      [COD_ORDER_STATUSES.OUT_FOR_DELIVERY]: 'Out for Delivery',
      [COD_ORDER_STATUSES.DELIVERED_AND_PAID]: 'Delivered & Paid',
      [COD_ORDER_STATUSES.DELIVERY_FAILED]: 'Delivery Failed',
      [COD_ORDER_STATUSES.CANCELLED]: 'Cancelled',
    };
    return labels[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      [COD_ORDER_STATUSES.PENDING_PHARMACY_CONFIRMATION]: 'bg-yellow-100 text-yellow-800',
      [COD_ORDER_STATUSES.PREPARING_ORDER]: 'bg-blue-100 text-blue-800',
      [COD_ORDER_STATUSES.AWAITING_RIDER]: 'bg-purple-100 text-purple-800',
      [COD_ORDER_STATUSES.RIDER_ASSIGNED]: 'bg-indigo-100 text-indigo-800',
      [COD_ORDER_STATUSES.OUT_FOR_DELIVERY]: 'bg-orange-100 text-orange-800',
      [COD_ORDER_STATUSES.DELIVERED_AND_PAID]: 'bg-green-100 text-green-800',
      [COD_ORDER_STATUSES.DELIVERY_FAILED]: 'bg-red-100 text-red-800',
      [COD_ORDER_STATUSES.CANCELLED]: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }
}

export const deliveryService = new DeliveryService();
