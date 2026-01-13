import React, { useState, useEffect } from 'react';
import BranchFormDialog from '@/components/BranchFormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Building, MapPin, Phone, User } from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';
import type { Branch } from '@/services/branchService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import StatsCard from '@/components/StatsCard';
import { ShoppingCart, DollarSign, AlertTriangle } from 'lucide-react';
import BranchSelector from '@/components/BranchSelector';
import { useAuth } from '@/contexts/AuthContext';

const BranchManagement: React.FC = () => {
  const { branches, loading, error, addBranch, updateBranch, deleteBranch } = useBranches();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [staffDialogBranch, setStaffDialogBranch] = useState<Branch | null>(null);
  const [branchStaff, setBranchStaff] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'pos-only' });
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSales: 0,
    lowStockItems: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    async function fetchBranchAnalytics() {
      // Fetch products for all branches to count low stock items
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, stock, min_stock_level, branch_id')
        .in('branch_id', branches.map(b => b.id));
      if (productsError) return;
      const lowStockItems = (products || []).filter((p: any) => Number(p.stock) <= Number(p.min_stock_level)).length;
      
      // For now, set mock values for orders since the orders table doesn't have branch_id
      setStats({ totalOrders: 0, totalSales: 0, lowStockItems });
    }
    if (branches.length > 0) fetchBranchAnalytics();
  }, [branches]);

  const handleAddBranch = async (branchData: any) => {
    try {
      await addBranch(branchData);
      setDialogOpen(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleEditBranch = async (branchData: any) => {
    if (!editBranch) return;
    
    try {
      await updateBranch(editBranch.id, branchData);
      setEditBranch(null);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleDeleteBranch = async () => {
    if (!deletingBranch) return;
    
    try {
      await deleteBranch(deletingBranch.id);
      setDeletingBranch(null);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const fetchBranchStaff = async (branchId: string) => {
    setStaffLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('pharmacy_id', branchId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBranchStaff(data || []);
    } catch (error) {
      setBranchStaff([]);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleCreateStaff = async () => {
    if (!staffDialogBranch) return;
    setCreatingStaff(true);
    try {
      const { error } = await supabase
        .from('staff_members')
        .insert({
          name: newStaff.name,
          email: newStaff.email,
          role: newStaff.role,
          pharmacy_id: staffDialogBranch.id,
          is_active: true,
          created_by: (user?.id || ''),
        });
      if (error) throw error;
      setNewStaff({ name: '', email: '', role: 'pos-only' });
      fetchBranchStaff(staffDialogBranch.id);
    } finally {
      setCreatingStaff(false);
    }
  };

  const openStaffDialog = (branch: Branch) => {
    setStaffDialogBranch(branch);
    fetchBranchStaff(branch.id);
  };

  const closeStaffDialog = () => {
    setStaffDialogBranch(null);
    setBranchStaff([]);
  };

  const getTypeBadge = (type: string) => {
    return (
      <Badge variant={type === 'retail' ? 'default' : 'secondary'}>
        {type === 'retail' ? 'Retail Pharmacy' : 'Wholesale'}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Branch Management</h1>
          <p className="text-gray-600 mt-2">Manage your pharmacy branches and locations</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Branch
        </Button>
      </div>

      <BranchSelector />

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard title="Total Orders" value={stats.totalOrders} icon={<ShoppingCart />} description="Last 30 days" />
        <StatsCard title="Total Sales" value={`TZS ${stats.totalSales.toLocaleString()}`} icon={<DollarSign />} description="Last 30 days" />
        <StatsCard title="Low Stock Items" value={stats.lowStockItems} icon={<AlertTriangle />} description="Across all branches" variant="warning" />
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <BranchFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        onSubmit={handleAddBranch} 
      />
      
      {editBranch && (
        <BranchFormDialog 
          open={!!editBranch} 
          onOpenChange={() => setEditBranch(null)} 
          onSubmit={handleEditBranch} 
          initialValues={editBranch} 
        />
      )}

      <AlertDialog open={!!deletingBranch} onOpenChange={() => setDeletingBranch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingBranch?.name}</strong>? 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteBranch}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Branch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {staffDialogBranch && (
        <Dialog open={!!staffDialogBranch} onOpenChange={closeStaffDialog}>
          <DialogContent className="max-w-md w-full">
            <DialogHeader>
              <DialogTitle>Manage Staff for {staffDialogBranch.name}</DialogTitle>
            </DialogHeader>
            {staffLoading ? (
              <div className="py-8 text-center text-gray-500">Loading staff...</div>
            ) : branchStaff.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No staff assigned yet.</div>
            ) : (
              <ul className="divide-y divide-gray-200 mb-4">
                {branchStaff.map((staff) => (
                  <li key={staff.id} className="py-2 flex items-center justify-between">
                    <span>{staff.name || staff.email}</span>
                    <Button size="sm" variant="outline">Unassign</Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 space-y-2">
              <h4 className="font-semibold text-gray-900">Add New Staff</h4>
              <Input
                placeholder="Name"
                value={newStaff.name}
                onChange={e => setNewStaff(s => ({ ...s, name: e.target.value }))}
              />
              <Input
                placeholder="Email"
                value={newStaff.email}
                onChange={e => setNewStaff(s => ({ ...s, email: e.target.value }))}
              />
              <select
                value={newStaff.role}
                onChange={e => setNewStaff(s => ({ ...s, role: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full"
              >
                <option value="pos-only">POS Only</option>
                <option value="inventory-only">Inventory Only</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <Button
                onClick={handleCreateStaff}
                disabled={creatingStaff || !newStaff.name || !newStaff.email}
                className="w-full mt-2"
              >
                {creatingStaff ? 'Adding...' : 'Add Staff'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {loading && branches.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading branches...</p>
          </div>
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No branches found</h3>
            <p className="text-gray-600 text-center mb-6">
              Get started by adding your first branch location.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Branch
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {branches.map(branch => (
            <Card key={branch.id} className="p-6 min-w-[320px] md:min-w-[380px] max-w-full shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-bold truncate">{branch.name}</CardTitle>
                <div className="flex gap-2">
                  <Button size="icon" variant="outline" onClick={() => setEditBranch(branch)}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="outline" onClick={() => setDeletingBranch(branch)}><Trash2 className="w-4 h-4" /></Button>
                  <Button size="sm" onClick={() => openStaffDialog(branch)} className="ml-2">Manage Staff</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  {getTypeBadge(branch.type)}
                </div>
                <div className="flex items-center gap-2 text-gray-700 mb-1">
                  <MapPin className="w-4 h-4" />
                  <span>{branch.address}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 mb-1">
                  <Phone className="w-4 h-4" />
                  <span>{branch.phone}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">Created: {branch.created_at && new Date(branch.created_at).toLocaleDateString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BranchManagement;
