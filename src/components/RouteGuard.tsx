import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logError } from '@/utils/logger';

// Maps route paths to staff permission keys
const ROUTE_PERMISSION_MAP: Record<string, string> = {
  '/pos': 'pos',
  '/retail/pos': 'pos',
  '/wholesale/pos': 'pos',
  '/inventory-management': 'inventory',
  '/inventory-dashboard': 'inventory',
  '/wholesale/inventory': 'inventory',
  '/catalog': 'inventory',
  '/orders': 'orders',
  '/wholesale-ordering': 'orders',
  '/wholesale/retailer-orders': 'orders',
  '/wholesale/purchase-orders': 'orders',
  '/cart': 'orders',
  '/business-center': 'business_tools',
  '/business-tools': 'business_tools',
  '/credit-request': 'credit_crm',
  '/credit-management': 'credit_crm',
  '/wholesale/business-tools/credit': 'credit_crm',
  '/wholesale/retailers': 'credit_crm',
  '/audit-reports': 'audit',
  '/retail/audit': 'audit',
  '/wholesale/audit': 'audit',
  '/analytics': 'analytics',
};

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

        // Staff permission enforcement at route level
        if (user.isStaff && user.staffInfo?.permissions) {
          const currentPath = location.pathname;
          const requiredPermission = ROUTE_PERMISSION_MAP[currentPath];
          
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
