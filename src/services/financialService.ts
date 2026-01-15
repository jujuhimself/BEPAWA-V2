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
  // Note: financial_transactions table may not exist in the database
  // This service provides a placeholder implementation that returns empty data
  async getTransactions(userId: string, dateRange?: { from: Date; to: Date }): Promise<FinancialTransaction[]> {
    try {
      // Since the table doesn't exist, return empty array
      console.warn('financial_transactions table not available');
      return [];
    } catch (error) {
      console.error('Error fetching financial transactions:', error);
      return [];
    }
  }

  async addTransaction(transaction: Omit<FinancialTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<FinancialTransaction | null> {
    try {
      // Since the table doesn't exist, return null
      console.warn('financial_transactions table not available');
      return null;
    } catch (error) {
      console.error('Error adding financial transaction:', error);
      return null;
    }
  }

  async getFinancialSummary(userId: string, dateRange?: { from: Date; to: Date }): Promise<FinancialSummary> {
    try {
      const transactions = await this.getTransactions(userId, dateRange);
      
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      // Monthly data
      const monthlyData = transactions.reduce((acc, transaction) => {
        const month = new Date(transaction.transaction_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const existing = acc.find(item => item.month === month);
        
        if (existing) {
          if (transaction.type === 'income') {
            existing.income += transaction.amount;
          } else {
            existing.expenses += transaction.amount;
          }
          existing.profit = existing.income - existing.expenses;
        } else {
          acc.push({
            month,
            income: transaction.type === 'income' ? transaction.amount : 0,
            expenses: transaction.type === 'expense' ? transaction.amount : 0,
            profit: transaction.type === 'income' ? transaction.amount : -transaction.amount
          });
        }
        
        return acc;
      }, [] as Array<{ month: string; income: number; expenses: number; profit: number; }>);

      // Category breakdown
      const categoryMap = new Map<string, number>();
      transactions.forEach(t => {
        const current = categoryMap.get(t.category) || 0;
        categoryMap.set(t.category, current + t.amount);
      });

      const categoryBreakdown = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);

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
    try {
      // Since the table doesn't exist, return false
      console.warn('financial_transactions table not available');
      return false;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  }

  async updateTransaction(transactionId: string, updates: Partial<FinancialTransaction>): Promise<FinancialTransaction | null> {
    try {
      // Since the table doesn't exist, return null
      console.warn('financial_transactions table not available');
      return null;
    } catch (error) {
      console.error('Error updating transaction:', error);
      return null;
    }
  }
}

export const financialService = new FinancialService(); 