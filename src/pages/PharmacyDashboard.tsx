import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Store, 
  Package, 
  ShoppingCart, 
  Clock, 
  TrendingUp, 
  BarChart3, 
  Scan, 
  Building2, 
  BoxesIcon,
  FileText,
  CreditCard,
  Truck,
  Plus
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { Badge } from "@/components/ui/badge";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import QuickReorder from "@/components/QuickReorder";
import BarcodeScanner from '@/components/BarcodeScanner';
import BusinessTools from '@/components/BusinessTools';
import { InvoiceGenerator } from "@/components/invoice/InvoiceGenerator";
import PharmacyCODOrders from "@/components/pharmacy/PharmacyCODOrders";

import {
  DashboardLayout,
  StatsCard,
  QuickActionCard,
  DashboardSection,
  ActivityCard,
  EmptyStateCard,
} from "@/components/dashboard";

import { useAuth } from "@/contexts/AuthContext";
import { useNotificationSubscription } from "@/hooks/useNotifications";
import { notificationService } from "@/services/notificationService";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/utils/logger";

export default function PharmacyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useNotificationSubscription();
  
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['pharmacyDashboardData', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated.");

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

      const cart = JSON.parse(localStorage.getItem(`bepawa_cart_${user.id}`) || '[]');

      const stats = {
        totalOrders: orders?.length || 0,
        pendingOrders: (orders || []).filter((o: any) => o.status === 'pending').length,
        cartItems: cart.length,
        deliveredOrders: (orders || []).filter((o: any) => o.status === 'delivered').length,
      };
      
      const recentOrders = (orders || []).slice(0, 5);
      
      return { stats, recentOrders };
    },
    enabled: !!user && user.role === 'retail',
  });

  useEffect(() => {
    if (data && user?.pharmacyName) {
      notificationService.createNotification({
        user_id: user.id,
        title: 'Welcome Back!',
        message: `Welcome back, ${user.pharmacyName}!`,
        type: 'info',
        metadata: { priority: 'low', category: 'system' }
      }).catch(console.error);
    }
  }, [data, user?.pharmacyName, user?.id]);

  useEffect(() => {
    if (!user || user.role !== 'retail') {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'retail') return null;

  const stats = data?.stats || { totalOrders: 0, pendingOrders: 0, cartItems: 0, deliveredOrders: 0 };
  const recentOrders = data?.recentOrders || [];

  const getStatusVariant = (status: string): "success" | "warning" | "danger" | "info" | "default" => {
    switch (status) {
      case 'delivered': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'info';
    }
  };

  return (
    <ErrorBoundary>
      <DashboardLayout
        title={`Welcome back, ${user?.pharmacyName || 'Pharmacy'}`}
        subtitle="Manage your orders, inventory, and grow your business"
        icon={<Store className="h-6 w-6" />}
        badge="Pharmacy"
        isLoading={isLoading}
        isError={isError}
        error={error as Error}
        onRetry={refetch}
        actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Scan className="h-4 w-4" />
                Scan Barcode
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <BarcodeScanner />
            </DialogContent>
          </Dialog>
        }
      >
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Orders"
            value={stats.totalOrders}
            subtitle="All time"
            icon={<Package className="h-5 w-5" />}
            variant="primary"
          />
          <StatsCard
            title="Pending Orders"
            value={stats.pendingOrders}
            subtitle="Awaiting action"
            icon={<Clock className="h-5 w-5" />}
            variant="warning"
          />
          <StatsCard
            title="Delivered"
            value={stats.deliveredOrders}
            subtitle="Completed orders"
            icon={<Truck className="h-5 w-5" />}
            variant="success"
          />
          <StatsCard
            title="Cart Items"
            value={stats.cartItems}
            subtitle="Items to order"
            icon={<ShoppingCart className="h-5 w-5" />}
            variant="info"
          />
        </div>

        {/* Quick Actions */}
        <DashboardSection
          title="Quick Actions"
          description="Frequently used features"
          icon={<TrendingUp className="h-4 w-4" />}
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionCard
              title="Inventory Forecast"
              description="Predict demand & optimize stock"
              icon={<BarChart3 className="h-5 w-5" />}
              href="/pharmacy/forecast"
              variant="primary"
            />
            <QuickActionCard
              title="Branch Management"
              description="Manage locations & staff"
              icon={<Building2 className="h-5 w-5" />}
              href="/retail/branches"
              variant="info"
            />
            <QuickActionCard
              title="Branch Inventory"
              description="Track stock by branch"
              icon={<BoxesIcon className="h-5 w-5" />}
              href="/retail/branch-inventory"
              variant="warning"
            />
            <QuickActionCard
              title="View Cart"
              description={`${stats.cartItems} items in cart`}
              icon={<ShoppingCart className="h-5 w-5" />}
              href="/cart"
              variant="success"
            />
          </div>
        </DashboardSection>

        {/* Additional Quick Links */}
        <div className="grid sm:grid-cols-3 gap-4">
          <QuickActionCard
            title="Order History"
            description="View all past orders"
            icon={<Clock className="h-5 w-5" />}
            href="/orders"
          />
          <QuickActionCard
            title="Credit Management"
            description="Manage credit & payments"
            icon={<CreditCard className="h-5 w-5" />}
            href="/credit-management"
          />
          <QuickActionCard
            title="Prescriptions"
            description="Manage prescriptions"
            icon={<FileText className="h-5 w-5" />}
            href="/prescription-management"
          />
        </div>

        {/* Quick Reorder Section */}
        <QuickReorder />

        {/* COD Orders */}
        <DashboardSection
          title="COD Orders"
          description="Cash on delivery orders requiring action"
          icon={<Truck className="h-4 w-4" />}
          action={{ label: "View All Orders", href: "/orders" }}
        >
          <PharmacyCODOrders />
        </DashboardSection>

        {/* Recent Orders */}
        <DashboardSection
          title="Recent Orders"
          description="Your latest incoming orders"
          icon={<Package className="h-4 w-4" />}
          action={{ label: "View All", href: "/orders" }}
        >
          {recentOrders.length === 0 ? (
            <EmptyStateCard
              icon={<Package className="h-6 w-6" />}
              title="No orders yet"
              description="When customers place orders, they'll appear here"
              action={{ label: "Browse Products", href: "/products" }}
            />
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <ActivityCard
                  key={order.id}
                  title={`Order #${order.order_number || order.id.slice(0, 8)}`}
                  subtitle={`TZS ${order.total_amount?.toLocaleString() || 0}`}
                  timestamp={new Date(order.created_at).toLocaleDateString()}
                  status={{
                    label: order.status?.replace(/-/g, ' ').toUpperCase() || 'PENDING',
                    variant: getStatusVariant(order.status),
                  }}
                  icon={<Package className="h-5 w-5" />}
                />
              ))}
            </div>
          )}
        </DashboardSection>

        {/* Analytics Section */}
        <DashboardSection
          title="Business Analytics"
          description="Track your pharmacy performance"
          icon={<BarChart3 className="h-4 w-4" />}
        >
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <AnalyticsDashboard />
            </CardContent>
          </Card>
        </DashboardSection>

        {/* Invoice Generator */}
        <DashboardSection
          title="Invoice Generator"
          description="Create and manage invoices"
          icon={<FileText className="h-4 w-4" />}
        >
          <InvoiceGenerator />
        </DashboardSection>

        {/* Business Tools */}
        <BusinessTools />
      </DashboardLayout>
    </ErrorBoundary>
  );
}
