import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Send, Loader2, Info, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { emailService } from '@/services/emailService';
import type { Branch } from '@/services/branchService';

interface StaffInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches?: Branch[];
  onSuccess?: () => void;
}

const defaultPermissions = {
  pos: false,
  inventory: false,
  orders: false,
  business_tools: false,
  analytics: false,
  credit_crm: false,
  audit: false,
  alerts: false,
};

const roleTemplates: Record<string, typeof defaultPermissions> = {
  'pos-only': { ...defaultPermissions, pos: true },
  'inventory-only': { ...defaultPermissions, inventory: true },
  'manager': { ...defaultPermissions, pos: true, inventory: true, orders: true, analytics: true },
  'admin': {
    pos: true,
    inventory: true, 
    orders: true,
    business_tools: true,
    analytics: true,
    credit_crm: true,
    audit: true,
    alerts: true
  },
};

const roleDescriptions: Record<string, string> = {
  'pos-only': 'Can only access Point of Sale',
  'inventory-only': 'Can manage products and stock',
  'manager': 'POS, Inventory, Orders, and Analytics',
  'admin': 'Full access to all features',
};

const StaffInviteDialog = ({ open, onOpenChange, branches = [], onSuccess }: StaffInviteDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'pos-only',
    branchId: '',
    permissions: { ...roleTemplates['pos-only'] },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  const handleRoleChange = (role: string) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: { ...roleTemplates[role] }
    }));
  };

  const handlePermissionChange = (perm: keyof typeof defaultPermissions, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [perm]: checked }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Check if user with this email already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', formData.email.trim().toLowerCase())
        .single();
      
      // Create staff member record
      const { data: staffMember, error: staffError } = await supabase
        .from('staff_members')
        .insert({
          name: formData.name,
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
          pharmacy_id: formData.branchId || user.id,
          permissions: formData.permissions,
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (staffError) throw staffError;
      
      // Send invitation email if enabled
      if (sendEmail) {
        try {
          const businessName = (user as any).pharmacyName || (user as any).businessName || 'Your Pharmacy';
          const branchName = branches.find(b => b.id === formData.branchId)?.name;
          
          await emailService.sendEmail({
            to: formData.email,
            subject: `You've been invited to join ${businessName} on Bepawa`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Bepawa!</h1>
                </div>
                <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #1f2937; margin-top: 0;">Hello ${formData.name}!</h2>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    You've been invited to join <strong>${businessName}</strong>${branchName ? ` (${branchName})` : ''} as a <strong>${formData.role.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>.
                  </p>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Your permissions include:
                  </p>
                  <ul style="color: #4b5563; font-size: 14px; line-height: 1.8;">
                    ${Object.entries(formData.permissions)
                      .filter(([_, enabled]) => enabled)
                      .map(([perm]) => `<li>${perm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>`)
                      .join('')}
                  </ul>
                  <div style="margin: 30px 0;">
                    <a href="https://bepawaa.com/login" 
                       style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      Get Started
                    </a>
                  </div>
                  <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
                    If you didn't expect this invitation, you can ignore this email.
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                  <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    Bepawa - Healthcare Management Platform
                  </p>
                </div>
              </div>
            `,
          });
          
          toast({
            title: 'Staff Member Added',
            description: `Invitation sent to ${formData.email}`,
          });
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
          toast({
            title: 'Staff Member Added',
            description: 'Staff added but invitation email could not be sent.',
            variant: 'default',
          });
        }
      } else {
        toast({
          title: 'Staff Member Added',
          description: `${formData.name} has been added to your team.`,
        });
      }
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        role: 'pos-only',
        branchId: '',
        permissions: { ...roleTemplates['pos-only'] },
      });
      
      onOpenChange(false);
      onSuccess?.();
      
    } catch (error: any) {
      console.error('Error inviting staff:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to invite staff member',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Staff Member
          </DialogTitle>
          <DialogDescription>
            Add a new team member and optionally send them an invitation email
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@example.com"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={formData.role} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roleDescriptions).map(([role, desc]) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex flex-col">
                      <span className="font-medium">{role.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {branches.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="branch">
                <Building className="inline h-4 w-4 mr-1" />
                Assign to Branch
              </Label>
              <Select value={formData.branchId} onValueChange={v => setFormData(prev => ({ ...prev, branchId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a branch (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Main Location</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2 p-3 border rounded-md bg-muted/50">
              {Object.entries(defaultPermissions).map(([perm]) => (
                <label key={perm} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={formData.permissions[perm as keyof typeof defaultPermissions]}
                    onCheckedChange={(checked) => handlePermissionChange(perm as keyof typeof defaultPermissions, !!checked)}
                  />
                  {perm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 border rounded-md">
            <Checkbox
              id="sendEmail"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(!!checked)}
            />
            <Label htmlFor="sendEmail" className="cursor-pointer flex-1">
              <span className="font-medium">Send invitation email</span>
              <p className="text-xs text-muted-foreground">
                The staff member will receive an email with login instructions
              </p>
            </Label>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {sendEmail ? 'Send Invitation' : 'Add Staff'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StaffInviteDialog;
