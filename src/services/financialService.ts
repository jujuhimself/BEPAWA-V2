import { supabase } from '@/integrations/supabase/client';

export interface FinancialTransaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
  reference?: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  monthlyData: Array<{
    month: string;
    income: number;
    expenses: number;
    profit: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

class FinancialService {
  async getTransactions(userId: string, dateRange?: { from: Date; to: Date }): Promise<FinancialTransaction[]> {
    try {
      // financial_transactions table doesn't exist, return empty
      return [];
    } catch (error) {
      console.error('Error fetching financial transactions:', error);
      return [];
    }
  }

  async addTransaction(transaction: Omit<FinancialTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<FinancialTransaction | null> {
    try {
      return null;
    } catch (error) {
      console.error('Error adding financial transaction:', error);
      return null;
    }
  }

  /**
   * Build a financial summary from POS sales + orders (real revenue data)
   */
  async getFinancialSummary(userId: string, dateRange?: { from: Date; to: Date }): Promise<FinancialSummary> {
    try {
      // Fetch POS sales as income
      let posSalesQuery = supabase
        .from('pos_sales')
        .select('total_amount, sale_date, created_at')
        .eq('user_id', userId);

      if (dateRange) {
        posSalesQuery = posSalesQuery
          .gte('sale_date', dateRange.from.toISOString())
          .lte('sale_date', dateRange.to.toISOString());
      }

      const { data: posSales } = await posSalesQuery;

      // Fetch orders where this user is the pharmacy (incoming orders = income)
      let ordersQuery = supabase
        .from('orders')
        .select('total_amount, created_at, status')
        .eq('pharmacy_id', userId)
        .in('status', ['delivered', 'completed', 'paid']);

      if (dateRange) {
        ordersQuery = ordersQuery
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data: orders } = await ordersQuery;

      // Fetch purchase orders placed by this user (expenses)
      let purchaseQuery = supabase
        .from('orders')
        .select('total_amount, created_at, status')
        .eq('user_id', userId)
        .in('status', ['delivered', 'completed', 'paid']);

      if (dateRange) {
        purchaseQuery = purchaseQuery
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data: purchases } = await purchaseQuery;

      // Calculate income from POS + incoming orders
      const posIncome = (posSales || []).reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const orderIncome = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const totalIncome = posIncome + orderIncome;

      // Calculate expenses from purchases
      const totalExpenses = (purchases || []).reduce((sum, p) => sum + (p.total_amount || 0), 0);

      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      // Build monthly data
      const monthlyMap = new Map<string, { income: number; expenses: number }>();

      const addToMonth = (dateStr: string, amount: number, type: 'income' | 'expense') => {
        const d = new Date(dateStr);
        const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const existing = monthlyMap.get(key) || { income: 0, expenses: 0 };
        if (type === 'income') existing.income += amount;
        else existing.expenses += amount;
        monthlyMap.set(key, existing);
      };

      (posSales || []).forEach(s => addToMonth(s.sale_date || s.created_at, s.total_amount || 0, 'income'));
      (orders || []).forEach(o => addToMonth(o.created_at, o.total_amount || 0, 'income'));
      (purchases || []).forEach(p => addToMonth(p.created_at, p.total_amount || 0, 'expense'));

      const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        profit: data.income - data.expenses
      }));

      // Category breakdown
      const categoryBreakdown = [
        { category: 'POS Sales', amount: posIncome, percentage: totalIncome > 0 ? (posIncome / totalIncome) * 100 : 0 },
        { category: 'Order Income', amount: orderIncome, percentage: totalIncome > 0 ? (orderIncome / totalIncome) * 100 : 0 },
        { category: 'Purchases', amount: totalExpenses, percentage: totalExpenses > 0 ? 100 : 0 },
      ].filter(c => c.amount > 0);

      return {
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin,
        monthlyData,
        categoryBreakdown
      };
    } catch (error) {
      console.error('Error generating financial summary:', error);
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        monthlyData: [],
        categoryBreakdown: []
      };
    }
  }

  async getTopExpenseCategories(userId: string, limit: number = 5): Promise<Array<{ category: string; amount: number; percentage: number }>> {
    try {
      const summary = await this.getFinancialSummary(userId);
      return summary.categoryBreakdown.slice(0, limit);
    } catch (error) {
      console.error('Error fetching top expense categories:', error);
      return [];
    }
  }

  async getProfitTrend(userId: string, months: number = 6): Promise<Array<{ month: string; profit: number }>> {
    try {
      const fromDate = new Date();
      fromDate.setMonth(fromDate.getMonth() - months);
      
      const summary = await this.getFinancialSummary(userId, { from: fromDate, to: new Date() });
      return summary.monthlyData.map(item => ({
        month: item.month,
        profit: item.profit
      }));
    } catch (error) {
      console.error('Error fetching profit trend:', error);
      return [];
    }
  }

  async deleteTransaction(transactionId: string): Promise<boolean> {
    return false;
  }

  async updateTransaction(transactionId: string, updates: Partial<FinancialTransaction>): Promise<FinancialTransaction | null> {
    return null;
  }
}

export const financialService = new FinancialService(); 
