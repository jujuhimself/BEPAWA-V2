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
  monthlyData: Array<{ month: string; income: number; expenses: number; profit: number }>;
  categoryBreakdown: Array<{ category: string; amount: number; percentage: number }>;
}

class FinancialService {
  async getTransactions(userId: string, dateRange?: { from: Date; to: Date }): Promise<FinancialTransaction[]> {
    try {
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false });

      if (dateRange) {
        query = query
          .gte('transaction_date', dateRange.from.toISOString().split('T')[0])
          .lte('transaction_date', dateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching financial transactions:', error);
        return [];
      }
      return (data || []) as FinancialTransaction[];
    } catch (error) {
      console.error('Error fetching financial transactions:', error);
      return [];
    }
  }

  async addTransaction(transaction: Omit<FinancialTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<FinancialTransaction | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('financial_transactions')
        .insert({
          user_id: user.id,
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category,
          description: transaction.description || '',
          reference: transaction.reference,
          transaction_date: transaction.transaction_date,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding financial transaction:', error);
        return null;
      }
      return data as FinancialTransaction;
    } catch (error) {
      console.error('Error adding financial transaction:', error);
      return null;
    }
  }

  async getFinancialSummary(userId: string, dateRange?: { from: Date; to: Date }): Promise<FinancialSummary> {
    try {
      // Fetch POS sales as income
      let posSalesQuery = supabase.from('pos_sales').select('total_amount, sale_date, created_at').eq('user_id', userId);
      if (dateRange) {
        posSalesQuery = posSalesQuery.gte('sale_date', dateRange.from.toISOString()).lte('sale_date', dateRange.to.toISOString());
      }
      const { data: posSales } = await posSalesQuery;

      // Fetch orders where this user is the pharmacy/wholesaler
      const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', userId).single();
      const orgColumn = userProfile?.role === 'wholesale' ? 'wholesaler_id' : 'pharmacy_id';
      
      let ordersQuery = supabase.from('orders').select('total_amount, created_at, status')
        .eq(orgColumn, userId)
        .in('status', ['delivered', 'completed', 'paid', 'delivered_and_paid']);
      if (dateRange) {
        ordersQuery = ordersQuery.gte('created_at', dateRange.from.toISOString()).lte('created_at', dateRange.to.toISOString());
      }
      const { data: orders } = await ordersQuery;

      // Fetch purchase orders as expenses
      let purchaseQuery = supabase.from('purchase_orders').select('total_amount, created_at, status')
        .eq('user_id', userId).in('status', ['received', 'completed', 'delivered']);
      if (dateRange) {
        purchaseQuery = purchaseQuery.gte('created_at', dateRange.from.toISOString()).lte('created_at', dateRange.to.toISOString());
      }
      const { data: purchases } = await purchaseQuery;

      // Fetch manual transactions
      const manualTransactions = await this.getTransactions(userId, dateRange);

      const posIncome = (posSales || []).reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const orderIncome = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const manualIncome = manualTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const manualExpense = manualTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const purchaseExpense = (purchases || []).reduce((sum, p) => sum + (p.total_amount || 0), 0);

      const totalIncome = posIncome + orderIncome + manualIncome;
      const totalExpenses = purchaseExpense + manualExpense;
      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      // Build monthly data
      const monthlyMap = new Map<string, { income: number; expenses: number }>();
      const addToMonth = (dateStr: string, amount: number, type: 'income' | 'expense') => {
        const d = new Date(dateStr);
        const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const existing = monthlyMap.get(key) || { income: 0, expenses: 0 };
        if (type === 'income') existing.income += amount; else existing.expenses += amount;
        monthlyMap.set(key, existing);
      };

      (posSales || []).forEach(s => addToMonth(s.sale_date || s.created_at, s.total_amount || 0, 'income'));
      (orders || []).forEach(o => addToMonth(o.created_at, o.total_amount || 0, 'income'));
      (purchases || []).forEach(p => addToMonth(p.created_at, p.total_amount || 0, 'expense'));
      manualTransactions.forEach(t => addToMonth(t.transaction_date, t.amount, t.type));

      const monthlyData = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month, income: data.income, expenses: data.expenses, profit: data.income - data.expenses
      }));

      const categoryBreakdown = [
        { category: 'POS Sales', amount: posIncome, percentage: totalIncome > 0 ? (posIncome / totalIncome) * 100 : 0 },
        { category: 'Order Income', amount: orderIncome, percentage: totalIncome > 0 ? (orderIncome / totalIncome) * 100 : 0 },
        { category: 'Manual Income', amount: manualIncome, percentage: totalIncome > 0 ? (manualIncome / totalIncome) * 100 : 0 },
        { category: 'Purchases', amount: purchaseExpense, percentage: totalExpenses > 0 ? (purchaseExpense / (totalExpenses)) * 100 : 0 },
        { category: 'Manual Expenses', amount: manualExpense, percentage: totalExpenses > 0 ? (manualExpense / (totalExpenses)) * 100 : 0 },
      ].filter(c => c.amount > 0);

      return { totalIncome, totalExpenses, netProfit, profitMargin, monthlyData, categoryBreakdown };
    } catch (error) {
      console.error('Error generating financial summary:', error);
      return { totalIncome: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0, monthlyData: [], categoryBreakdown: [] };
    }
  }

  async getTopExpenseCategories(userId: string, limit: number = 5) {
    const summary = await this.getFinancialSummary(userId);
    return summary.categoryBreakdown.slice(0, limit);
  }

  async getProfitTrend(userId: string, months: number = 6) {
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - months);
    const summary = await this.getFinancialSummary(userId, { from: fromDate, to: new Date() });
    return summary.monthlyData.map(item => ({ month: item.month, profit: item.profit }));
  }

  async deleteTransaction(transactionId: string): Promise<boolean> {
    const { error } = await supabase.from('financial_transactions').delete().eq('id', transactionId);
    if (error) { console.error('Error deleting transaction:', error); return false; }
    return true;
  }

  async updateTransaction(transactionId: string, updates: Partial<FinancialTransaction>): Promise<FinancialTransaction | null> {
    const { data, error } = await supabase
      .from('financial_transactions')
      .update({
        type: updates.type,
        amount: updates.amount,
        category: updates.category,
        description: updates.description,
        reference: updates.reference,
        transaction_date: updates.transaction_date,
      })
      .eq('id', transactionId)
      .select()
      .single();
    if (error) { console.error('Error updating transaction:', error); return null; }
    return data as FinancialTransaction;
  }
}

export const financialService = new FinancialService();
