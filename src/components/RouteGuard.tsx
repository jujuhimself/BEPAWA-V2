import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logError } from '@/utils/logger';

// Maps route prefixes to staff permission keys
// Order matters: more specific prefixes should come first
const ROUTE_PERMISSION_PREFIXES: Array<{ prefix: string; permission: string }> = [
  // POS
  { prefix: '/pos', permission: 'pos' },
  { prefix: '/retail/pos', permission: 'pos' },
  { prefix: '/retail/advanced-pos', permission: 'pos' },
  { prefix: '/wholesale/pos', permission: 'pos' },
  { prefix: '/wholesale/advanced-pos', permission: 'pos' },
  // Inventory
  { prefix: '/inventory', permission: 'inventory' },
  { prefix: '/catalog', permission: 'inventory' },
  { prefix: '/wholesale/inventory', permission: 'inventory' },
  { prefix: '/retail/inventory', permission: 'inventory' },
  { prefix: '/products', permission: 'inventory' },
  { prefix: '/suppliers', permission: 'inventory' },
  { prefix: '/purchase-orders', permission: 'inventory' },
  { prefix: '/retail/purchase-orders', permission: 'inventory' },
  { prefix: '/wholesale/purchase-orders', permission: 'inventory' },
  { prefix: '/retail/forecast', permission: 'inventory' },
  { prefix: '/wholesale/forecast', permission: 'inventory' },
  { prefix: '/pharmacy/forecast', permission: 'inventory' },
  { prefix: '/retail/adjustment', permission: 'inventory' },
  { prefix: '/wholesale/adjustment', permission: 'inventory' },
  // Orders
  { prefix: '/orders', permission: 'orders' },
  { prefix: '/wholesale-ordering', permission: 'orders' },
  { prefix: '/wholesale/retailer-orders', permission: 'orders' },
  { prefix: '/cart', permission: 'orders' },
  { prefix: '/my-orders', permission: 'orders' },
  // Business tools
  { prefix: '/business-center', permission: 'business_tools' },
  { prefix: '/business-tools', permission: 'business_tools' },
  { prefix: '/retail/business-tools', permission: 'business_tools' },
  { prefix: '/wholesale/business-tools', permission: 'business_tools' },
  // Credit/CRM
  { prefix: '/credit', permission: 'credit_crm' },
  { prefix: '/wholesale/retailers', permission: 'credit_crm' },
  { prefix: '/wholesale/credit', permission: 'credit_crm' },
  { prefix: '/retail/credit', permission: 'credit_crm' },
  // Audit
  { prefix: '/audit', permission: 'audit' },
  { prefix: '/retail/audit', permission: 'audit' },
  { prefix: '/wholesale/audit', permission: 'audit' },
  // Analytics
  { prefix: '/analytics', permission: 'analytics' },
  // Staff management
  { prefix: '/retail/staff', permission: 'business_tools' },
  { prefix: '/wholesale/staff', permission: 'business_tools' },
  // Reporting
  { prefix: '/retail/reporting', permission: 'analytics' },
];

function getRequiredPermission(pathname: string): string | null {
  for (const entry of ROUTE_PERMISSION_PREFIXES) {
    if (pathname === entry.prefix || pathname.startsWith(entry.prefix + '/')) {
      return entry.permission;
    }
  }
  return null;
}

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requireApproval?: boolean;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  allowedRoles = [], 
  requireApproval = false 
}) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!isLoading) {
        if (!user) {
          navigate('/login');
          return;
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
          setError(`Access denied. Required role: ${allowedRoles.join(' or ')}`);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Staff permission enforcement at route level (prefix-based)
        if (user.isStaff && user.staffInfo?.permissions) {
          const currentPath = location.pathname;
          const requiredPermission = getRequiredPermission(currentPath);
          
          if (requiredPermission && !user.staffInfo.permissions[requiredPermission]) {
            setError('You do not have permission to access this section. Contact your employer to update your permissions.');
            return;
          }
        }

        setError(null);
      }
    } catch (err: any) {
      logError(err, 'RouteGuard authorization error');
      setError('An error occurred while checking permissions');
    }
  }, [user, isLoading, navigate, allowedRoles, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="space-x-2">
              <Button onClick={() => navigate(-1)} variant="outline">
                Go Back
              </Button>
              <Button onClick={() => navigate('/')} variant="default">
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
};

export default RouteGuard;
