import { supabase } from '@/integrations/supabase/client';
import { comprehensiveNotificationService } from './comprehensiveNotificationService';

/**
 * Service to monitor inventory levels and send alerts
 */
class InventoryMonitorService {
  /**
   * Check product stock and send alert if below threshold
   */
  async checkAndAlertLowStock(productId: string): Promise<void> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, stock, min_stock_level, user_id')
        .eq('id', productId)
        .single();

      if (error || !product) {
        console.error('Error fetching product:', error);
        return;
      }

      // Check if stock is below minimum threshold
      const minStock = product.min_stock_level || 10;
      if (product.stock <= minStock) {
        // Get owner email
        const { data: owner } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('id', product.user_id)
          .single();
        
        if (owner?.id && owner?.email) {
          await comprehensiveNotificationService.notifyLowStock(
            owner.id,
            owner.email,
            product.name,
            product.stock,
            minStock
          );
        }
      }
    } catch (error) {
      console.error('Error checking low stock:', error);
    }
  }

  /**
   * Monitor all products for a user
   */
  async monitorUserInventory(userId: string): Promise<void> {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, stock, min_stock_level')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching low stock products:', error);
        return;
      }

      // Filter low stock products and send alert for each
      const lowStockProducts = (products || []).filter(p => p.stock <= (p.min_stock_level || 10));
      for (const product of lowStockProducts) {
        await this.checkAndAlertLowStock(product.id);
      }
    } catch (error) {
      console.error('Error monitoring inventory:', error);
    }
  }
}

export const inventoryMonitorService = new InventoryMonitorService();