import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/utils/logger';

/**
 * Reusable SMS Service — all SMS goes through the send-sms edge function.
 * SMS failures are caught and logged — they never block the order flow.
 */
class SmsService {
  private async send(params: {
    to: string;
    message: string;
    eventType: string;
    orderId?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: params.to,
          message: params.message,
          event_type: params.eventType,
          order_id: params.orderId,
        },
      });

      if (error) {
        logError(error, `SMS:${params.eventType}`);
      }
    } catch (err) {
      // Never throw — SMS must not block order flow
      logError(err, `SMS:${params.eventType}`);
    }
  }

  // ==========================================
  // COD ORDER EVENTS
  // ==========================================

  /** Notify pharmacy/wholesaler that a new COD order was placed */
  async notifyOrderPlaced(params: {
    sellerPhone: string;
    sellerName: string;
    orderNumber: string;
    buyerName: string;
    totalAmount: number;
    orderId?: string;
  }): Promise<void> {
    const msg = `📦 Bepawa: New COD order #${params.orderNumber} from ${params.buyerName}. Amount: TZS ${params.totalAmount.toLocaleString()}. Please review and accept in your dashboard.`;
    await this.send({
      to: params.sellerPhone,
      message: msg,
      eventType: 'order_placed',
      orderId: params.orderId,
    });
  }

  /** Notify buyer that the order was placed successfully */
  async notifyBuyerOrderPlaced(params: {
    buyerPhone: string;
    orderNumber: string;
    totalAmount: number;
    sellerName: string;
    orderId?: string;
  }): Promise<void> {
    const msg = `✅ Bepawa: Your order #${params.orderNumber} has been placed with ${params.sellerName}. Total: TZS ${params.totalAmount.toLocaleString()}. You'll pay cash on delivery. We'll notify you when it's accepted.`;
    await this.send({
      to: params.buyerPhone,
      message: msg,
      eventType: 'order_placed_buyer',
      orderId: params.orderId,
    });
  }

  /** Notify buyer that the seller accepted the order */
  async notifyOrderAccepted(params: {
    buyerPhone: string;
    orderNumber: string;
    sellerName: string;
    orderId?: string;
  }): Promise<void> {
    const msg = `🎉 Bepawa: Great news! Your order #${params.orderNumber} has been accepted by ${params.sellerName}. It's being prepared now. We'll notify you when a rider is on the way.`;
    await this.send({
      to: params.buyerPhone,
      message: msg,
      eventType: 'order_accepted',
      orderId: params.orderId,
    });
  }

  /** Notify buyer and rider about rider assignment */
  async notifyRiderAssigned(params: {
    buyerPhone: string;
    riderPhone: string;
    riderName: string;
    orderNumber: string;
    pickupAddress: string;
    deliveryAddress: string;
    totalAmount: number;
    orderId?: string;
  }): Promise<void> {
    // Notify buyer
    const buyerMsg = `🏍️ Bepawa: A rider (${params.riderName}) has been assigned to deliver your order #${params.orderNumber}. Please prepare TZS ${params.totalAmount.toLocaleString()} cash for payment on delivery.`;
    await this.send({
      to: params.buyerPhone,
      message: buyerMsg,
      eventType: 'rider_assigned_buyer',
      orderId: params.orderId,
    });

    // Notify rider
    const riderMsg = `🚴 Bepawa Delivery: New assignment! Order #${params.orderNumber}. Pickup: ${params.pickupAddress}. Deliver to: ${params.deliveryAddress}. Collect TZS ${params.totalAmount.toLocaleString()} cash. Open your app for details.`;
    await this.send({
      to: params.riderPhone,
      message: riderMsg,
      eventType: 'rider_assigned_rider',
      orderId: params.orderId,
    });
  }

  /** Notify buyer and seller that order was delivered & paid */
  async notifyDeliveredAndPaid(params: {
    buyerPhone: string;
    sellerPhone: string;
    orderNumber: string;
    totalAmount: number;
    orderId?: string;
  }): Promise<void> {
    // Notify buyer
    const buyerMsg = `✅ Bepawa: Your order #${params.orderNumber} has been delivered successfully. Thank you for shopping with Bepawa!`;
    await this.send({
      to: params.buyerPhone,
      message: buyerMsg,
      eventType: 'order_delivered_buyer',
      orderId: params.orderId,
    });

    // Notify seller
    const sellerMsg = `💰 Bepawa: Order #${params.orderNumber} delivered & TZS ${params.totalAmount.toLocaleString()} collected. Cash will be remitted to you. Check your dashboard for details.`;
    await this.send({
      to: params.sellerPhone,
      message: sellerMsg,
      eventType: 'order_delivered_seller',
      orderId: params.orderId,
    });
  }
}

export const smsService = new SmsService();
