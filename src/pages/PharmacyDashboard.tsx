import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, Loader2, AlertTriangle, Store } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';

import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import QuickReorder from "@/components/QuickReorder";
import BarcodeScanner from '@/components/BarcodeScanner';
import BusinessTools from '@/components/BusinessTools';
import { InvoiceGenerator } from "@/components/invoice/InvoiceGenerator";

import { SubscriptionStatusCard } from "@/components/subscription/SubscriptionStatusCard";
import PharmacyStatsCards from "@/components/pharmacy/PharmacyStatsCards";
import PharmacyQuickActions from "@/components/pharmacy/PharmacyQuickActions";
import PharmacyAdditionalServices from "@/components/pharmacy/PharmacyAdditionalServices";
import PharmacyRecentOrders from "@/components/pharmacy/PharmacyRecentOrders";
import PharmacyCODOrders from "@/components/pharmacy/PharmacyCODOrders";

import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";
import { useNotificationSubscription } from "@/hooks/useNotifications";
import { notificationService } from "@/services/notificationService";

import { SUBSCRIPTION_PLANS } from "@/types/subscription";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/utils/logger";

export default function PharmacyDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { currentPlan, getMaxStaffAccounts, getMaxBranches } = useSubscription();
  const maxStaffAccounts = getMaxStaffAccounts();
  const maxBranches = getMaxBranches();

  // Ensure real-time notifications are enabled for pharmacy users
  useNotificationSubscription();
  
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['pharmacyDashboardData', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated.");

      // Fetch orders for current pharmacy
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('pharmacy_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (ordersError) {
        logError(ordersError, 'PharmacyDashboard fetch orders');
        throw ordersError;
      }

      // For cart, still use localStorage
      const cart = JSON.parse(localStorage.getItem(`bepawa_cart_${user.id}`) || '[]');

      const stats = {
        totalOrders: orders?.length || 0,
        pendingOrders: (orders || []).filter((o: any) => o.status === 'pending').length,
        cartItems: cart.length
      };
      
      const recentOrders = (orders || []).slice(0, 5);
      
      return { stats, recentOrders };
    },
    enabled: !!user && user.role === 'retail',
  });

  useEffect(() => {
    if (data && user?.pharmacyName) {
      const sendWelcomeNotification = async () => {
        try {
          await notificationService.createNotification({
            user_id: user.id,
            title: 'Welcome Back!',
            message: `Welcome back, ${user.pharmacyName}! Your dashboard has been updated with the latest information.`,
            type: 'info',
            metadata: {
              priority: 'low',
              category: 'system'
            }
          });
        } catch (error) {
          console.error('Failed to send welcome notification:', error);
        }
      };
      
      sendWelcomeNotification();
    }
  }, [data, user?.pharmacyName]);

  const stats = data?.stats || { totalOrders: 0, pendingOrders: 0, cartItems: 0 };
  const recentOrders = data?.recentOrders || [];

  useEffect(() => {
    if (!user || user.role !== 'retail') {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'retail') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-96">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading your dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-96">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <div className="text-destructive text-lg mb-4">Error loading dashboard: {(error as Error)?.message || "An unknown error occurred."}</div>
            <Button onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <BreadcrumbNavigation />
          
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  Welcome back, {user?.pharmacyName}
                </h1>
                <p className="text-muted-foreground text-lg">Manage your orders and browse our medical product catalog</p>
              </div>
            </div>
          </div>


          {/* Quick Access Cards for Forecasting and Barcode Scanner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Link to="/pharmacy/forecast">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <span role="img" aria-label="Forecast">📈</span> Inventory Forecasting
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Predict demand, plan stock, and optimize reordering for your pharmacy.</p>
                </CardContent>
              </Card>
            </Link>
            <Dialog>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <span role="img" aria-label="Barcode">🔍</span> Barcode Scanner
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Scan product barcodes to quickly find and manage inventory items.</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-2xl w-full">
                <BarcodeScanner />
              </DialogContent>
            </Dialog>
            <Link to="/retail/branches">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <span role="img" aria-label="Branches">🏢</span> Branch Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Manage your branches, add new locations, and assign staff.</p>
                </CardContent>
              </Card>
            </Link>
            <Link to="/retail/branch-inventory">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <span role="img" aria-label="Inventory">📦</span> Branch Inventory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Manage inventory for your selected branch.</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          <PharmacyStatsCards stats={stats} />
          <QuickReorder />

          {/* Analytics Dashboard */}
          <div className="mb-8">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-2xl">Business Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsDashboard />
              </CardContent>
            </Card>
          </div>

          <PharmacyQuickActions cartItems={stats.cartItems} />
          
          {/* COD Orders Section */}
          <div className="mb-8">
            <PharmacyCODOrders />
          </div>
          
          <PharmacyAdditionalServices />
          <PharmacyRecentOrders recentOrders={recentOrders} />
          
          {/* Invoice Generator */}
          <div className="mb-8">
            <InvoiceGenerator />
          </div>
          
          <BusinessTools />
        </div>
      </div>
    </ErrorBoundary>
  );
}
