import { notificationService } from './notificationService';
import { emailService } from './emailService';

class ComprehensiveNotificationService {
  private async sendMultiChannel(
    userId: string,
    userEmail: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error',
    metadata?: any
  ): Promise<void> {
    try {
      await notificationService.createNotification({
        user_id: userId,
        title,
        message,
        type,
        metadata: { ...metadata, priority: type === 'error' ? 'high' : 'medium' },
      });
    } catch (error) {
      console.error('Failed to create notification:', error);
    }

    try {
      const emailMsg = `<h2 style="color: #374151;">${title}</h2><p>${message}</p>
        ${metadata?.actionUrl ? `<div style="margin: 30px 0; text-align: center;">
          <a href="${metadata.actionUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            ${metadata.actionLabel || 'View Details'}
          </a></div>` : ''}`;
      await emailService.sendNotificationEmail(userEmail, emailMsg);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  async notifyLabTestBooked(userId: string, email: string, patientName: string, testType: string, appointmentDate: string, labName: string): Promise<void> {
    await this.sendMultiChannel(userId, email, 'Lab Test Booked 🔬', `Hi ${patientName}, your ${testType} at ${labName} is on ${appointmentDate}`, 'success', { category: 'lab_appointment' });
  }

  async notifyCircumcisionBooked(userId: string, email: string, appointmentDate: string, providerName: string): Promise<void> {
    await this.sendMultiChannel(userId, email, 'Appointment Confirmed 🏥', `Circumcision at ${providerName} on ${appointmentDate}`, 'success', { category: 'appointment' });
  }

  async notifyOrderPlaced(userId: string, email: string, orderNumber: string, totalAmount: number, items: any[]): Promise<void> {
    await this.sendMultiChannel(userId, email, 'Order Confirmed 🛒', `Order ${orderNumber} - TZS ${totalAmount.toLocaleString()}`, 'success', { category: 'order', actionUrl: `/orders/${orderNumber}`, actionLabel: 'View Order' });
  }

  async notifyOrderStatusChange(userId: string, email: string, orderNumber: string, oldStatus: string, newStatus: string): Promise<void> {
    await this.sendMultiChannel(userId, email, 'Order Updated', `Order ${orderNumber}: ${oldStatus} → ${newStatus}`, 'info', { category: 'order' });
  }

  async notifyLabResultsReady(userId: string, email: string, patientName: string, testType: string, resultsUrl?: string): Promise<void> {
    await this.sendMultiChannel(userId, email, 'Lab Results Ready 📋', `Hi ${patientName}, your ${testType} results are available`, 'success', { category: 'lab_results', actionUrl: resultsUrl, actionLabel: 'View Results' });
  }

  async notifyPrescriptionUploaded(userId: string, email: string, prescriptionId: string): Promise<void> {
    await this.sendMultiChannel(userId, email, 'Prescription Uploaded 💊', `Prescription ${prescriptionId} uploaded successfully`, 'success', { category: 'prescription' });
  }

  async notifyPrescriptionReady(userId: string, email: string, prescriptionId: string, pharmacyName: string): Promise<void> {
    await this.sendMultiChannel(userId, email, 'Prescription Ready 💊', `Ready for pickup at ${pharmacyName}`, 'success', { category: 'prescription' });
  }

  async notifyAppointmentStatusChange(userId: string, email: string, serviceType: string, appointmentDate: string, status: string): Promise<void> {
    const title = status === 'confirmed' ? 'Appointment Confirmed ✓' : status === 'cancelled' ? 'Appointment Cancelled' : 'Appointment Updated';
    await this.sendMultiChannel(userId, email, title, `${serviceType} on ${appointmentDate} - ${status}`, status === 'confirmed' ? 'success' : 'warning', { category: 'appointment' });
  }

  async notifyPharmacyNewOrder(pharmacyId: string, email: string, orderNumber: string, customerName: string, totalAmount: number): Promise<void> {
    await this.sendMultiChannel(pharmacyId, email, 'New Order 🛒', `${customerName} - Order ${orderNumber} - TZS ${totalAmount.toLocaleString()}`, 'info', { category: 'order', priority: 'high' });
  }

  async notifyLowStock(pharmacyId: string, email: string, productName: string, currentStock: number, minThreshold: number): Promise<void> {
    await this.sendMultiChannel(pharmacyId, email, 'Low Stock Alert ⚠️', `${productName}: ${currentStock} units (threshold: ${minThreshold})`, 'warning', { category: 'inventory', priority: 'high' });
  }

  async notifyWholesaleOrderUpdate(pharmacyId: string, email: string, orderNumber: string, status: string): Promise<void> {
    await this.sendMultiChannel(pharmacyId, email, 'Wholesale Order Updated', `Order ${orderNumber}: ${status}`, 'info', { category: 'wholesale_order' });
  }

  async notifyWholesalerNewOrder(wholesalerId: string, email: string, orderNumber: string, retailerName: string, totalAmount: number): Promise<void> {
    await this.sendMultiChannel(wholesalerId, email, 'New Retailer Order 📦', `${retailerName} - ${orderNumber} - TZS ${totalAmount.toLocaleString()}`, 'info', { category: 'order', priority: 'high' });
  }

  async notifyCreditPaymentDue(wholesalerId: string, email: string, retailerName: string, amount: number, dueDate: string): Promise<void> {
    await this.sendMultiChannel(wholesalerId, email, 'Payment Due 💳', `${retailerName}: TZS ${amount.toLocaleString()} due ${dueDate}`, 'warning', { category: 'credit', priority: 'high' });
  }

  async notifyLabNewAppointment(labId: string, email: string, patientName: string, testType: string, appointmentDate: string): Promise<void> {
    await this.sendMultiChannel(labId, email, 'New Appointment 🔬', `${patientName} - ${testType} - ${appointmentDate}`, 'info', { category: 'appointment', priority: 'high' });
  }

  async notifyLabCancelledAppointment(labId: string, email: string, appointmentId: string, patientName: string, testType: string): Promise<void> {
    await this.sendMultiChannel(labId, email, 'Appointment Cancelled', `${patientName} - ${testType} (${appointmentId})`, 'warning', { category: 'appointment', priority: 'high' });
  }

  async notifyLabResultsUploaded(patientId: string, email: string, patientName: string, testType: string, appointmentDate: string): Promise<void> {
    await this.sendMultiChannel(patientId, email, 'Results Uploaded 📊', `${testType} results from ${appointmentDate}`, 'success', { category: 'lab_results' });
  }

  async notifyAdminNewProviderRequest(adminId: string, email: string, providerName: string, providerType: string): Promise<void> {
    await this.sendMultiChannel(adminId, email, 'New Provider 🏪', `${providerName} (${providerType}) registration`, 'info', { category: 'admin', priority: 'high', actionUrl: '/admin/approvals' });
  }

  async notifyProviderApproved(providerId: string, email: string, branchName: string, organizationName: string): Promise<void> {
    await this.sendMultiChannel(providerId, email, 'Account Approved ✅', `${branchName} for ${organizationName} approved`, 'success', { category: 'approval' });
  }

  async notifyPaymentReceived(userId: string, email: string, amount: number, payerName: string, paymentType: string): Promise<void> {
    await this.sendMultiChannel(userId, email, 'Payment Received 💰', `TZS ${amount.toLocaleString()} from ${payerName} (${paymentType})`, 'success', { category: 'payment' });
  }

  async notifySystemMaintenance(userId: string, email: string, maintenanceDate: string, duration: string): Promise<void> {
    await this.sendMultiChannel(userId, email, 'Maintenance 🔧', `Scheduled for ${maintenanceDate}, duration: ${duration}`, 'warning', { category: 'system' });
  }

  async notifyFeatureUpdate(userId: string, email: string, featureName: string, description: string): Promise<void> {
    await this.sendMultiChannel(userId, email, 'New Feature 🎉', `${featureName}: ${description}`, 'info', { category: 'feature_update' });
  }

  // ==========================================
  // COD / DELIVERY NOTIFICATIONS
  // ==========================================

  async notifyCODOrderPlaced(customerId: string, email: string, orderNumber: string, totalAmount: number, pharmacyName: string): Promise<void> {
    await this.sendMultiChannel(
      customerId,
      email,
      'Order Placed! 🛒',
      `Your order #${orderNumber} for TZS ${totalAmount.toLocaleString()} has been sent to ${pharmacyName}. Pay cash on delivery.`,
      'success',
      { category: 'cod_order', actionUrl: '/my-orders', actionLabel: 'Track Order' }
    );
  }

  async notifyPharmacyCODOrder(pharmacyId: string, email: string, orderNumber: string, customerName: string, totalAmount: number): Promise<void> {
    await this.sendMultiChannel(
      pharmacyId,
      email,
      'New COD Order! 🛵',
      `Order #${orderNumber} from ${customerName} for TZS ${totalAmount.toLocaleString()} requires confirmation.`,
      'info',
      { category: 'cod_order', priority: 'high', actionUrl: '/pharmacy', actionLabel: 'View Order' }
    );
  }

  async notifyOrderAccepted(customerId: string, email: string, orderNumber: string, pharmacyName: string): Promise<void> {
    await this.sendMultiChannel(
      customerId,
      email,
      'Order Accepted! ✅',
      `Great news! ${pharmacyName} has accepted your order #${orderNumber} and is preparing it.`,
      'success',
      { category: 'cod_order', actionUrl: '/my-orders', actionLabel: 'Track Order' }
    );
  }

  async notifyOrderRejected(customerId: string, email: string, orderNumber: string, reason: string): Promise<void> {
    await this.sendMultiChannel(
      customerId,
      email,
      'Order Not Available ❌',
      `Sorry, your order #${orderNumber} could not be fulfilled. Reason: ${reason}`,
      'error',
      { category: 'cod_order' }
    );
  }

  async notifyOrderReadyForPickup(pharmacyId: string, email: string, orderNumber: string): Promise<void> {
    await this.sendMultiChannel(
      pharmacyId,
      email,
      'Order Ready for Pickup 📦',
      `Order #${orderNumber} is packed and ready. Assign a rider for delivery.`,
      'info',
      { category: 'cod_order', actionUrl: '/pharmacy', actionLabel: 'Assign Rider' }
    );
  }

  async notifyRiderAssigned(customerId: string, email: string, orderNumber: string, riderName: string, riderPhone: string): Promise<void> {
    await this.sendMultiChannel(
      customerId,
      email,
      'Rider Assigned! 🏍️',
      `${riderName} will deliver your order #${orderNumber}. Contact: ${riderPhone}`,
      'info',
      { category: 'delivery', actionUrl: '/my-orders', actionLabel: 'Track Delivery' }
    );
  }

  async notifyRiderNewAssignment(riderId: string, email: string, orderNumber: string, pharmacyName: string, deliveryAddress: string, cashAmount: number): Promise<void> {
    await this.sendMultiChannel(
      riderId,
      email,
      'New Delivery Assignment! 📍',
      `Pickup from ${pharmacyName}, deliver to ${deliveryAddress}. Cash to collect: TZS ${cashAmount.toLocaleString()}`,
      'info',
      { category: 'delivery', priority: 'high', actionUrl: '/rider', actionLabel: 'View Assignment' }
    );
  }

  async notifyOrderPickedUp(customerId: string, email: string, orderNumber: string, riderName: string): Promise<void> {
    await this.sendMultiChannel(
      customerId,
      email,
      'Order On The Way! 🚀',
      `${riderName} has picked up your order #${orderNumber} and is heading to you!`,
      'success',
      { category: 'delivery', actionUrl: '/my-orders', actionLabel: 'Track Live' }
    );
  }

  async notifyOrderDelivered(customerId: string, email: string, orderNumber: string, totalAmount: number): Promise<void> {
    await this.sendMultiChannel(
      customerId,
      email,
      'Order Delivered! 🎉',
      `Your order #${orderNumber} has been delivered. Thank you for shopping with us!`,
      'success',
      { category: 'delivery' }
    );
  }

  async notifyPharmacyOrderDelivered(pharmacyId: string, email: string, orderNumber: string, cashAmount: number, riderName: string): Promise<void> {
    await this.sendMultiChannel(
      pharmacyId,
      email,
      'Order Delivered & Paid 💰',
      `Order #${orderNumber} delivered by ${riderName}. Cash collected: TZS ${cashAmount.toLocaleString()}`,
      'success',
      { category: 'delivery' }
    );
  }

  async notifyDeliveryFailed(customerId: string, email: string, orderNumber: string, reason: string): Promise<void> {
    await this.sendMultiChannel(
      customerId,
      email,
      'Delivery Issue ⚠️',
      `We couldn't complete delivery for order #${orderNumber}. Reason: ${reason}. We'll contact you soon.`,
      'warning',
      { category: 'delivery' }
    );
  }

  async notifyPharmacyDeliveryFailed(pharmacyId: string, email: string, orderNumber: string, reason: string, riderName: string): Promise<void> {
    await this.sendMultiChannel(
      pharmacyId,
      email,
      'Delivery Failed ❌',
      `Order #${orderNumber} delivery failed by ${riderName}. Reason: ${reason}. Stock has been released.`,
      'error',
      { category: 'delivery', priority: 'high', actionUrl: '/pharmacy', actionLabel: 'View Order' }
    );
  }
}

export const comprehensiveNotificationService = new ComprehensiveNotificationService();
