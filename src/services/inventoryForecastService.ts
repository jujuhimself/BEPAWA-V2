
import { supabase } from '@/integrations/supabase/client';

export interface InventoryForecast {
  id: string;
  user_id: string;
  product_id: string;
  product_name?: string;
  forecast_date: string;
  forecasted_demand: number;
  actual?: number;
  created_at: string;
  updated_at: string;
}

class InventoryForecastService {
  async addForecast(forecast: Omit<InventoryForecast, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('inventory_forecasts')
      .insert(forecast)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async fetchForecasts() {
    const { data, error } = await supabase
      .from('inventory_forecasts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const forecasts = data || [];
    
    // Fetch product names for all unique product IDs
    const productIds = [...new Set(forecasts.map(f => f.product_id))];
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);
      
      const productMap = new Map((products || []).map(p => [p.id, p.name]));
      return forecasts.map(f => ({
        ...f,
        product_name: productMap.get(f.product_id) || f.product_id,
      }));
    }
    
    return forecasts;
  }

  async updateActual(id: string, actual: number) {
    const { data, error } = await supabase
      .from('inventory_forecasts')
      .update({ actual })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export const inventoryForecastService = new InventoryForecastService();
