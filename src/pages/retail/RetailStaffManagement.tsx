
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, User, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'cashier' | 'manager' | 'pharmacist' | 'assistant';
  is_active: boolean;
  created_at: string;
  permissions: string[];
}

const RetailStaffManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'cashier' as StaffMember['role'],
    permissions: [] as string[]
  });

  const rolePermissions = {
    'cashier': ['pos_sales', 'view_products'],
    'assistant': ['pos_sales', 'view_products', 'manage_inventory'],
    'pharmacist': ['pos_sales', 'view_products', 'manage_inventory', 'prescriptions'],
    'manager': ['pos_sales', 'view_products', 'manage_inventory', 'prescriptions', 'view_reports', 'manage_staff']
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('pharmacy_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match our interface
      const transformedStaff: StaffMember[] = (data || []).map(member => ({
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role as 'cashier' | 'manager' | 'pharmacist' | 'assistant',
        is_active: member.is_active,
        created_at: member.created_at,
        permissions: rolePermissions[member.role as keyof typeof rolePermissions] || []
      }));
      
      setStaff(transformedStaff);
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error",
        description: "Failed to fetch staff members",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const staffData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        pharmacy_id: user.id,
        created_by: user.id,
        is_active: true
      };

      if (editingStaff) {
        const { error } = await supabase
          .from('staff_members')
          .update(staffData)
          .eq('id', editingStaff.id);

        if (error) throw error;
        toast({ title: "Staff member updated successfully" });
      } else {
        const { error } = await supabase
          .from('staff_members')
          .insert(staffData);

        if (error) throw error;
        toast({ title: "Staff member added successfully" });
      }

      setFormData({ name: '', email: '', role: 'cashier', permissions: [] });
      setIsAddDialogOpen(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (error: any) {
      console.error('Error saving staff member:', error);
      toast({
        title: "Error",
        description: "Failed to save staff member",
        variant: "destructive",
      });
    }
  };

  const toggleStaffStatus = async (staffId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('staff_members')
        .update({ is_active: !currentStatus })
        .eq('id', staffId);

      if (error) throw error;
      
      toast({
        title: `Staff member ${!currentStatus ? 'activated' : 'deactivated'}`,
      });
      fetchStaff();
    } catch (error: any) {
      console.error('Error updating staff status:', error);
      toast({
        title: "Error",
        description: "Failed to update staff status",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      'cashier': { variant: 'secondary' as const, label: 'Cashier' },
      'assistant': { variant: 'outline' as const, label: 'Assistant' },
      'pharmacist': { variant: 'default' as const, label: 'Pharmacist' },
      'manager': { variant: 'destructive' as const, label: 'Manager' }
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig['cashier'];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPermissionBadges = (permissions: string[]) => {
    const permissionLabels = {
      'pos_sales': 'POS Sales',
      'view_products': 'View Products',
      'manage_inventory': 'Manage Inventory',
      'prescriptions': 'Prescriptions',
      'view_reports': 'View Reports',
      'manage_staff': 'Manage Staff'
    };

    return permissions.map(permission => (
      <Badge key={permission} variant="outline" className="text-xs mr-1 mb-1">
        {permissionLabels[permission as keyof typeof permissionLabels] || permission}
      </Badge>
    ));
  };

  const openEditDialog = (staffMember: StaffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      role: staffMember.role,
      permissions: staffMember.permissions
    });
    setIsAddDialogOpen(true);
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingStaff(null);
    setFormData({ name: '', email: '', role: 'cashier', permissions: [] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Staff Management</h2>
          <p className="text-gray-600">Manage retail staff with role-based permissions</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role & Permissions</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: StaffMember['role']) => {
                    setFormData({ 
                      ...formData, 
                      role: value,
                      permissions: rolePermissions[value] || []
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cashier">Cashier - POS operations only</SelectItem>
                    <SelectItem value="assistant">Assistant - POS + basic inventory</SelectItem>
                    <SelectItem value="pharmacist">Pharmacist - Full pharmacy operations</SelectItem>
                    <SelectItem value="manager">Manager - Full access + staff management</SelectItem>
                  </SelectContent>
                </Select>
                
                {formData.permissions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-1">Permissions:</p>
                    <div className="flex flex-wrap gap-1">
                      {getPermissionBadges(formData.permissions)}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingStaff ? 'Update' : 'Add'} Staff Member
                </Button>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Staff Members ({staff.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No staff members found. Add your first staff member to get started.
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {getPermissionBadges(member.permissions)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.is_active ? "default" : "secondary"}>
                        {member.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(member)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStaffStatus(member.id, member.is_active)}
                        >
                          {member.is_active ? (
                            <Trash2 className="h-3 w-3" />
                          ) : (
                            <Shield className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RetailStaffManagement;
