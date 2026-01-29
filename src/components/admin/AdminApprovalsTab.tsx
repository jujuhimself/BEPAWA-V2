import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, UserCheck, UserX, Eye, CheckCircle } from "lucide-react";
import { UserAccount } from "@/types/userAccount";
import UserProfileDrawer from "./UserProfileDrawer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  pendingUsers: UserAccount[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  getRoleIcon: (role: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
}

const roles = [
  { label: "All Roles", value: "all" },
  { label: "Retail", value: "retail" },
  { label: "Wholesale", value: "wholesale" },
  { label: "Lab", value: "lab" },
  { label: "Individual", value: "individual" }
];

const AdminApprovalsTab: React.FC<Props> = ({
  pendingUsers,
  onApprove,
  onReject,
  getRoleIcon,
  getStatusBadge,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [drawerUser, setDrawerUser] = useState<UserAccount | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    return pendingUsers.filter(u =>
      (u.name + u.email + (u.businessName || "")).toLowerCase().includes(search.toLowerCase()) &&
      (roleFilter === 'all' ? true : u.role === roleFilter)
    );
  }, [pendingUsers, search, roleFilter]);

  const openDrawer = (user: UserAccount) => {
    setDrawerUser(user);
    setDrawerOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Pending Account Approvals ({filtered.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          <Input
            placeholder="Search by name, email, business..."
            className="max-w-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map(r => (
                <SelectItem value={r.value} key={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground">No pending approvals</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((user) => (
              <div key={user.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {getRoleIcon(user.role)}
                    <div>
                      <h4 className="font-semibold">{user.businessName || user.name}</h4>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize">{user.role}</Badge>
                        {getStatusBadge(user.status)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Registered: {user.registeredAt}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Registered</p>
                    <p className="text-sm font-medium">{user.registeredAt}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => onApprove(user.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => onReject(user.id)}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openDrawer(user)}>
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <UserProfileDrawer user={drawerUser} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </CardContent>
    </Card>
  );
};

export default AdminApprovalsTab;
