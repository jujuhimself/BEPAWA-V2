import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreditAccount {
  id: string;
  credit_limit: number;
  available_credit: number;
  current_balance: number;
  status: string;
  created_at: string;
  customer_name?: string;
  customer_contact?: string;
  user_id: string;
}

interface CreditTransaction {
  id: string;
  credit_account_id: string;
  transaction_type: string;
  amount: number;
  reference?: string;
  transaction_date: string;
}

const CreditCRMManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CreditAccount | null>(null);
  const [accountForm, setAccountForm] = useState({
    customer_id: '',
    credit_limit: 0
  });
  const [transactionForm, setTransactionForm] = useState({
    transaction_type: 'payment',
    amount: 0,
    reference: ''
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCreditAccounts();
    fetchCustomers();
  }, []);

  const fetchCreditAccounts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('credit_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Map data to match our interface
      const mappedAccounts: CreditAccount[] = (data || []).map((account: any) => ({
        id: account.id,
        credit_limit: account.credit_limit,
        available_credit: account.available_credit,
        current_balance: account.current_balance,
        status: account.status,
        created_at: account.created_at,
        user_id: account.user_id,
        customer_name: account.customer_name || 'Unknown',
        customer_contact: account.contact_info || '',
      }));
      
      setAccounts(mappedAccounts);
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to fetch credit accounts', variant: 'destructive' });
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone')
        .eq('role', 'individual');
      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchTransactions = async (accountId: string) => {
    // Since credit_transactions table doesn't exist, we'll use empty array
    setTransactions([]);
  };

  const createCreditAccount = async () => {
    if (!user) return;
    try {
      const selectedCustomer = customers.find(c => c.id === accountForm.customer_id);
      const { error } = await supabase
        .from('credit_accounts')
        .insert({
          user_id: user.id,
          customer_name: selectedCustomer?.name || 'Unknown',
          contact_info: selectedCustomer?.phone || selectedCustomer?.email || '',
          credit_limit: accountForm.credit_limit,
          available_credit: accountForm.credit_limit,
          current_balance: 0,
          status: 'active',
        });
      if (error) throw error;
      toast({ title: 'Credit Account Created', description: 'New credit account created successfully' });
      setAccountForm({ customer_id: '', credit_limit: 0 });
      setIsAccountDialogOpen(false);
      fetchCreditAccounts();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to create credit account', variant: 'destructive' });
    }
  };

  const createTransaction = async () => {
    if (!selectedAccount) return;
    try {
      // Update account balance directly since credit_transactions table doesn't exist
      let newBalance = selectedAccount.current_balance;
      let newAvailable = selectedAccount.available_credit;
      if (transactionForm.transaction_type === 'credit') {
        newBalance += transactionForm.amount;
        newAvailable -= transactionForm.amount;
      } else if (transactionForm.transaction_type === 'payment') {
        newBalance -= transactionForm.amount;
        newAvailable += transactionForm.amount;
      }
      const { error: updateError } = await supabase
        .from('credit_accounts')
        .update({ current_balance: newBalance, available_credit: newAvailable })
        .eq('id', selectedAccount.id);
      if (updateError) throw updateError;
      toast({ title: 'Transaction Recorded', description: `${transactionForm.transaction_type} transaction recorded successfully` });
      setTransactionForm({ transaction_type: 'payment', amount: 0, reference: '' });
      setIsTransactionDialogOpen(false);
      fetchCreditAccounts();
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to record transaction', variant: 'destructive' });
    }
  };

  const filteredAccounts = accounts.filter(acc =>
    acc.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Credit / CRM Management</h2>
          <p className="text-gray-600">Manage customer credit accounts, requests, and CRM info</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => setIsAccountDialogOpen(true)}>
            Add Credit Account
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Credit Accounts ({filteredAccounts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Credit Limit</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No credit accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map(acc => (
                  <TableRow key={acc.id}>
                    <TableCell>{acc.customer_name}</TableCell>
                    <TableCell>{acc.customer_contact}</TableCell>
                    <TableCell>{acc.credit_limit}</TableCell>
                    <TableCell>{acc.available_credit}</TableCell>
                    <TableCell>{acc.current_balance}</TableCell>
                    <TableCell>
                      <Badge variant={acc.status === 'active' ? 'default' : 'secondary'}>
                        {acc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedAccount(acc); setIsTransactionDialogOpen(true); fetchTransactions(acc.id); }}>
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Add Credit Account Dialog */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credit Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Select Customer</label>
              <select
                className="w-full border rounded p-2"
                value={accountForm.customer_id}
                onChange={e => setAccountForm({ ...accountForm, customer_id: e.target.value })}
              >
                <option value="">Choose customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email || c.phone})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Credit Limit</label>
              <Input
                type="number"
                value={accountForm.credit_limit}
                onChange={e => setAccountForm({ ...accountForm, credit_limit: Number(e.target.value) })}
                placeholder="Enter credit limit"
              />
            </div>
            <Button onClick={createCreditAccount} className="w-full">
              Create Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Transaction Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Account</DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4">
              <div>
                <strong>Customer:</strong> {selectedAccount.customer_name}
              </div>
              <div>
                <strong>Credit Limit:</strong> {selectedAccount.credit_limit}
              </div>
              <div>
                <strong>Available Credit:</strong> {selectedAccount.available_credit}
              </div>
              <div>
                <strong>Current Balance:</strong> {selectedAccount.current_balance}
              </div>
              <div>
                <strong>Status:</strong> {selectedAccount.status}
              </div>
              <div className="space-y-2">
                <label className="block font-medium">Transaction Type</label>
                <select
                  className="w-full border rounded p-2"
                  value={transactionForm.transaction_type}
                  onChange={e => setTransactionForm({ ...transactionForm, transaction_type: e.target.value })}
                >
                  <option value="payment">Payment</option>
                  <option value="credit">Credit</option>
                </select>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={transactionForm.amount}
                  onChange={e => setTransactionForm({ ...transactionForm, amount: Number(e.target.value) })}
                />
                <Input
                  placeholder="Reference (optional)"
                  value={transactionForm.reference}
                  onChange={e => setTransactionForm({ ...transactionForm, reference: e.target.value })}
                />
                <Button onClick={createTransaction} className="w-full">
                  Record Transaction
                </Button>
              </div>
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Transaction History</h4>
                {transactions.length === 0 ? (
                  <div className="text-gray-500 text-sm">No transactions found.</div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map(tx => (
                          <TableRow key={tx.id}>
                            <TableCell>{new Date(tx.transaction_date).toLocaleDateString()}</TableCell>
                            <TableCell>{tx.transaction_type}</TableCell>
                            <TableCell>{tx.amount}</TableCell>
                            <TableCell>{tx.reference}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditCRMManagement;
