import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, History, AlertTriangle, CheckCircle, Building } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useInventory";
import { auditService } from "@/services/auditService";

interface StockAdjustment {
  id: string;
  product_id: string;
  product_name?: string;
  adjustment_type: string;
  quantity: number;
  reason: string;
  reference_number?: string;
  status: string;
  created_at: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  branch_id: string;
  branch_name?: string;
}

const REASONS = [
  { value: 'expired', label: 'Product Expired' },
  { value: 'damaged', label: 'Product Damaged' },
  { value: 'stolen', label: 'Theft/Loss' },
  { value: 'returned', label: 'Customer Return' },
  { value: 'restock', label: 'New Stock Received' },
  { value: 'correction', label: 'Stock Count Correction' },
  { value: 'promotion', label: 'Promotional Giveaway' },
  { value: 'other', label: 'Other' },
];

const WholesaleInventoryAdjustments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    branch_id: '',
    adjustment_type: 'increase',
    quantity: 0,
    reason: '',
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    fetchAdjustments();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, code')
        .eq('parent_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setBranches(data || []);
    } catch (error: any) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchAdjustments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('stock_adjustments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with product and branch names
      const enrichedAdjustments = await Promise.all(
        (data || []).map(async (adjustment) => {
          const product = products.find(p => p.id === adjustment.product_id);
          const branch = branches.find(b => b.id === adjustment.branch_id);
          
          return {
            ...adjustment,
            product_name: product?.name || 'Unknown Product',
            branch_name: branch?.name || 'Unknown Branch'
          };
        })
      );

      setAdjustments(enrichedAdjustments);
    } catch (error: any) {
      console.error('Error fetching adjustments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory adjustments",
        variant: "destructive",
      });
    }
  };

  const createAdjustment = async () => {
    if (!user || !formData.product_id || !formData.branch_id || formData.quantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields with valid values",
        variant: "destructive",
      });
      return;
    }

    try {
      const product = products.find(p => p.id === formData.product_id);
      if (!product) throw new Error('Product not found');

      // Create adjustment record
      const { data: adjustmentData, error: adjustmentError } = await supabase
        .from('stock_adjustments')
        .insert({
          user_id: user.id,
          product_id: formData.product_id,
          branch_id: formData.branch_id,
          adjustment_type: formData.adjustment_type,
          quantity: formData.quantity,
          reason: formData.reason,
          reference_number: formData.reference_number || null,
          created_by: user.id,
          status: 'pending'
        })
        .select()
        .single();

      if (adjustmentError) throw adjustmentError;

      // Log the adjustment in audit trail
      await auditService.logStockUpdate(
        formData.product_id,
        product.stock,
        formData.adjustment_type === 'increase' 
          ? product.stock + formData.quantity 
          : product.stock - formData.quantity,
        `Inventory adjustment: ${formData.reason}`
      );

      // Auto-approve for now (in production, this might require approval workflow)
      await approveAdjustment(adjustmentData.id);

      toast({
        title: "Adjustment Created",
        description: "Inventory adjustment has been created and approved",
      });

      setFormData({
        product_id: '',
        branch_id: '',
        adjustment_type: 'increase',
        quantity: 0,
        reason: '',
        reference_number: '',
        notes: '',
      });
      setIsAdjustmentDialogOpen(false);
      fetchAdjustments();

    } catch (error: any) {
      console.error('Error creating adjustment:', error);
      toast({
        title: "Error",
        description: "Failed to create inventory adjustment",
        variant: "destructive",
      });
    }
  };

  const approveAdjustment = async (adjustmentId: string) => {
    if (!user) return;

    try {
      const adjustment = adjustments.find(a => a.id === adjustmentId);
      if (!adjustment) return;

      const product = products.find(p => p.id === adjustment.product_id);
      if (!product) return;

      // Update adjustment status
      await supabase
        .from('stock_adjustments')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', adjustmentId);

      // Update product stock
      const newStock = adjustment.adjustment_type === 'increase' 
        ? product.stock + adjustment.quantity 
        : Math.max(0, product.stock - adjustment.quantity);

      await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', adjustment.product_id);

      // Log inventory movement
      await supabase
        .from('inventory_movements')
        .insert({
          user_id: user.id,
          product_id: adjustment.product_id,
          movement_type: adjustment.adjustment_type === 'increase' ? 'in' : 'out',
          quantity: adjustment.quantity,
          reason: `Stock adjustment: ${adjustment.reason}`,
          created_by: user.id
        });

      toast({
        title: "Adjustment Approved",
        description: "Inventory adjustment has been approved and stock updated",
      });

      fetchAdjustments();

    } catch (error: any) {
      console.error('Error approving adjustment:', error);
      toast({
        title: "Error",
        description: "Failed to approve adjustment",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { variant: 'secondary' as const, label: 'Pending', icon: AlertTriangle },
      'approved': { variant: 'default' as const, label: 'Approved', icon: CheckCircle },
      'rejected': { variant: 'destructive' as const, label: 'Rejected', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['pending'];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const pendingAdjustments = adjustments.filter(a => a.status === 'pending');
  const approvedAdjustments = adjustments.filter(a => a.status === 'approved');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Inventory Adjustments</h2>
          <p className="text-gray-600">Manage stock adjustments with comprehensive audit trail</p>
        </div>
        <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Adjustment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Stock Adjustment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Branch</Label>
                <Select value={formData.branch_id} onValueChange={(value) => setFormData({...formData, branch_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          {branch.name} ({branch.code})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Product</Label>
                <Select value={formData.product_id} onValueChange={(value) => setFormData({...formData, product_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} (Stock: {product.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Adjustment Type</Label>
                  <Select value={formData.adjustment_type} onValueChange={(value) => setFormData({...formData, adjustment_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="increase">Increase Stock</SelectItem>
                      <SelectItem value="decrease">Decrease Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                    placeholder="Enter quantity"
                  />
                </div>
              </div>
              <div>
                <Label>Reference Number (Optional)</Label>
                <Input
                  value={formData.reference_number}
                  onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                  placeholder="Purchase order, return, etc."
                />
              </div>
              <div>
                <Label>Reason</Label>
                <Select value={formData.reason} onValueChange={(value) => setFormData({...formData, reason: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.reason === 'other' && (
                <div>
                  <Label>Custom Reason</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Describe the reason for this adjustment"
                    rows={2}
                  />
                </div>
              )}
              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Optional additional details..."
                  rows={2}
                />
              </div>
              <Button onClick={createAdjustment} className="w-full">
                Create Adjustment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingAdjustments.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedAdjustments.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Adjustments ({adjustments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Pending Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAdjustments.map((adjustment) => (
                    <TableRow key={adjustment.id}>
                      <TableCell className="font-medium">{adjustment.product_name}</TableCell>
                      <TableCell>{adjustment.branch_name}</TableCell>
                      <TableCell>
                        <Badge variant={adjustment.adjustment_type === 'increase' ? 'default' : 'destructive'}>
                          {adjustment.adjustment_type === 'increase' ? '+' : '-'}{adjustment.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>{adjustment.quantity}</TableCell>
                      <TableCell className="max-w-xs truncate">{adjustment.reason}</TableCell>
                      <TableCell>{new Date(adjustment.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => approveAdjustment(adjustment.id)}
                        >
                          Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingAdjustments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No pending adjustments
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Approved Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedAdjustments.slice(0, 10).map((adjustment) => (
                    <TableRow key={adjustment.id}>
                      <TableCell className="font-medium">{adjustment.product_name}</TableCell>
                      <TableCell>{adjustment.branch_name}</TableCell>
                      <TableCell>
                        <Badge variant={adjustment.adjustment_type === 'increase' ? 'default' : 'destructive'}>
                          {adjustment.adjustment_type === 'increase' ? '+' : '-'}{adjustment.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>{adjustment.quantity}</TableCell>
                      <TableCell className="max-w-xs truncate">{adjustment.reason}</TableCell>
                      <TableCell>{adjustment.approved_at ? new Date(adjustment.approved_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{adjustment.reference_number || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {approvedAdjustments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No approved adjustments
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                All Adjustments History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.slice(0, 20).map((adjustment) => (
                    <TableRow key={adjustment.id}>
                      <TableCell className="font-medium">{adjustment.product_name}</TableCell>
                      <TableCell>{adjustment.branch_name}</TableCell>
                      <TableCell>
                        <Badge variant={adjustment.adjustment_type === 'increase' ? 'default' : 'destructive'}>
                          {adjustment.adjustment_type === 'increase' ? '+' : '-'}{adjustment.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>{adjustment.quantity}</TableCell>
                      <TableCell>{getStatusBadge(adjustment.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">{adjustment.reason}</TableCell>
                      <TableCell>{new Date(adjustment.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{adjustment.reference_number || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {adjustments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No adjustments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WholesaleInventoryAdjustments;
