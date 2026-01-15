import { supabase } from '@/integrations/supabase/client';

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  business_type?: string;
  total_orders: number;
  total_spent: number;
  last_order_date?: string;
  notes?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CustomerCommunication {
  id: string;
  user_id: string;
  customer_id: string;
  type: 'call' | 'email' | 'sms' | 'meeting';
  subject: string;
  notes: string;
  communication_date: string;
  created_at: string;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  activeCustomers: number;
  topCustomers: Array<{
    id: string;
    name: string;
    totalSpent: number;
    totalOrders: number;
  }>;
  recentCommunications: CustomerCommunication[];
  customerGrowth: Array<{
    month: string;
    newCustomers: number;
  }>;
}

class CustomerService {
  async getCustomers(userId: string): Promise<Customer[]> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
          console.error('Customers table does not exist. Please run the database migration first.');
          throw new Error('Database tables not set up. Please contact support.');
        }
        throw error;
      }
      return (data || []) as Customer[];
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  async addCustomer(customer: Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Customer | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customer,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist
          console.error('Customers table does not exist. Please run the database migration first.');
          throw new Error('Database tables not set up. Please contact support.');
        }
        throw error;
      }
      return data as Customer | null;
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  }

  async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        if (error.code === '42P01') {
          throw new Error('Database tables not set up. Please contact support.');
        }
        throw error;
      }
      return data as Customer | null;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  async deleteCustomer(customerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        if (error.code === '42P01') {
          throw new Error('Database tables not set up. Please contact support.');
        }
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  async getCommunications(userId: string, customerId?: string): Promise<CustomerCommunication[]> {
    try {
      let query = supabase
        .from('customer_communications')
        .select('*')
        .eq('user_id', userId)
        .order('communication_date', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      
      if (error) {
        if (error.code === '42P01') {
          throw new Error('Database tables not set up. Please contact support.');
        }
        throw error;
      }
      return (data || []) as CustomerCommunication[];
    } catch (error) {
      console.error('Error fetching communications:', error);
      throw error;
    }
  }

  async addCommunication(communication: Omit<CustomerCommunication, 'id' | 'user_id' | 'created_at'>): Promise<CustomerCommunication | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('customer_communications')
        .insert({
          ...communication,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === '42P01') {
          throw new Error('Database tables not set up. Please contact support.');
        }
        throw error;
      }
      return data as CustomerCommunication | null;
    } catch (error) {
      console.error('Error adding communication:', error);
      throw error;
    }
  }

  async getCustomerAnalytics(userId: string): Promise<CustomerAnalytics> {
    try {
      const customers = await this.getCustomers(userId);
      const communications = await this.getCommunications(userId);

      const totalCustomers = customers.length;
      const activeCustomers = customers.filter(c => c.status === 'active').length;

      const topCustomers = customers
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 5)
        .map(c => ({
          id: c.id,
          name: c.name,
          totalSpent: c.total_spent,
          totalOrders: c.total_orders
        }));

      const recentCommunications = communications.slice(0, 10);

      // Customer growth by month
      const customerGrowth = customers.reduce((acc, customer) => {
        const month = new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const existing = acc.find(item => item.month === month);
        
        if (existing) {
          existing.newCustomers += 1;
        } else {
          acc.push({ month, newCustomers: 1 });
        }
        
        return acc;
      }, [] as Array<{ month: string; newCustomers: number }>);

      return {
        totalCustomers,
        activeCustomers,
        topCustomers,
        recentCommunications,
        customerGrowth
      };
    } catch (error) {
      console.error('Error getting customer analytics:', error);
      throw error;
    }
  }

  async searchCustomers(userId: string, searchTerm: string): Promise<Customer[]> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          throw new Error('Database tables not set up. Please contact support.');
        }
        throw error;
      }
      return (data || []) as Customer[];
    } catch (error) {
      console.error('Error searching customers:', error);
      throw error;
    }
  }

  async getCustomerById(userId: string, customerId: string): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .eq('id', customerId)
        .single();

      if (error) {
        if (error.code === '42P01') {
          throw new Error('Database tables not set up. Please contact support.');
        }
        throw error;
      }
      return data as Customer | null;
    } catch (error) {
      console.error('Error fetching customer by ID:', error);
      throw error;
    }
  }

  async updateCustomerOrderStats(customerId: string, orderAmount: number): Promise<boolean> {
    try {
      // First get current values
      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('total_orders, total_spent')
        .eq('id', customerId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('customers')
        .update({
          total_orders: (customer?.total_orders || 0) + 1,
          total_spent: (customer?.total_spent || 0) + orderAmount,
          last_order_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', customerId);

      if (error) {
        if (error.code === '42P01') {
          throw new Error('Database tables not set up. Please contact support.');
        }
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error updating customer order stats:', error);
      throw error;
    }
  }
}

export const customerService = new CustomerService(); 