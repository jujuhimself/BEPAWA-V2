import { useEffect, useState, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Package, 
  DollarSign, 
  Users, 
  TrendingUp, 
  FileText, 
  BarChart3, 
  Building2,
  BoxesIcon,
  Scan,
  AlertTriangle,
  Clock,
  Truck
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  DashboardLayout,
  StatsCard,
  QuickActionCard,
  DashboardSection,
  ActivityCard,
  EmptyStateCard,
} from "@/components/dashboard";

import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import InventoryForecasting from '@/components/inventory/InventoryForecasting';
import BarcodeScanner from '@/components/BarcodeScanner';
import { InvoiceGenerator } from "@/components/invoice/InvoiceGenerator";
import WholesaleCODOrders from "@/components/wholesale/WholesaleCODOrders";

type WholesaleOrder = {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  status: string;
  pharmacy_id?: string;
  pharmacy_name?: string;
};

type AnalyticsData = {
  monthlyRevenue: any[];
  orderTrends: any[];
};

const COLORS = ['hsl(var(--primary))', 'hsl(180, 70%, 45%)', 'hsl(25, 95%, 53%)', 'hsl(0, 70%, 50%)', 'hsl(270, 70%, 60%)'];

const WholesaleDashboard = () => {
  const { user } = useAuth();
  const { selectedBranch } = useBranch();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeRetailers: 0,
    lowStockItems: 0
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    monthlyRevenue: [],
    orderTrends: []
  });

  useEffect(() => {
    if (!user || user.role !== 'wholesale') {
      navigate('/login');
      return;
    }

    async function fetchWholesaleData() {
      setIsLoading(true);
      try {
        // Fetch orders
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('id, order_number, created_at, total_amount, status, pharmacy_id')
          .eq('wholesaler_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (orderError) throw orderError;

        // Fetch pharmacy names
        const pharmacyIds = orderData?.map((o: any) => o.pharmacy_id).filter(Boolean);
        let pharmacies: Record<string, string> = {};
        
        if (pharmacyIds && pharmacyIds.length > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id, business_name, name')
            .in('id', pharmacyIds);

          profileData?.forEach((profile: any) => {
            pharmacies[profile.id] = profile.business_name || profile.name;
          });
        }

        const enhancedOrders = (orderData || []).map((order: any) => ({
          ...order,
          pharmacy_name: pharmacies[order.pharmacy_id] || ""
        }));

        setOrders(enhancedOrders);

        // Fetch all orders for stats
        const { data: allOrders } = await supabase
          .from('orders')
          .select('id, total_amount, pharmacy_id, created_at')
          .eq('wholesaler_id', user.id);

        const totalRevenue = (allOrders || []).reduce((sum: number, ord: any) => sum + Number(ord.total_amount || 0), 0);
        const totalOrders = (allOrders || []).length || 0;
        const activeRetailers = new Set((allOrders || []).map((o: any) => o.pharmacy_id)).size;

        // Count low stock items
        const { data: productData } = await supabase
          .from('products')
          .select('id, stock, min_stock_level')
          .eq('wholesaler_id', user.id);

        const lowStockItems = productData?.filter((prod: any) => Number(prod.stock) <= Number(prod.min_stock_level || 10)).length || 0;

        setStats({ totalRevenue, totalOrders, activeRetailers, lowStockItems });

        // Generate analytics
        const monthlyRevenue = generateMonthlyRevenueData(allOrders || []);
        const orderTrends = generateOrderTrendsData(allOrders || []);
        setAnalyticsData({ monthlyRevenue, orderTrends });

      } catch (error) {
        console.error('Error fetching wholesale data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchWholesaleData();
  }, [user, navigate, toast]);

  const generateMonthlyRevenueData = (orders: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.created_at);
        return orderDate.getFullYear() === currentYear && orderDate.getMonth() === index;
      });
      
      return {
        month,
        revenue: monthOrders.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0) / 1000000,
        orders: monthOrders.length
      };
    });
  };

  const generateOrderTrendsData = (orders: any[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        return orderDate === date;
      });

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        orders: dayOrders.length,
        revenue: dayOrders.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0) / 1000000
      };
    });
  };

  const getStatusVariant = (status: string): "success" | "warning" | "danger" | "info" | "default" => {
    switch (status) {
      case 'delivered': case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'info';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!user || user.role !== 'wholesale') return null;

  return (
    <DashboardLayout
      title={`Wholesale Dashboard${selectedBranch ? ` - ${selectedBranch.name}` : ''}`}
      subtitle="Manage your wholesale operations and track performance"
      icon={<Package className="h-6 w-6" />}
      badge="Wholesale"
      isLoading={isLoading}
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
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          subtitle="All time"
          icon={<DollarSign className="h-5 w-5" />}
          variant="primary"
        />
        <StatsCard
          title="Total Orders"
          value={stats.totalOrders}
          subtitle="Orders received"
          icon={<Package className="h-5 w-5" />}
          variant="info"
        />
        <StatsCard
          title="Active Retailers"
          value={stats.activeRetailers}
          subtitle="Buying from you"
          icon={<Users className="h-5 w-5" />}
          variant="success"
        />
        <StatsCard
          title="Low Stock Items"
          value={stats.lowStockItems}
          subtitle="Need reordering"
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={stats.lowStockItems > 0 ? "danger" : "default"}
        />
      </div>

      {/* Quick Actions */}
      <DashboardSection
        title="Quick Actions"
        description="Manage your wholesale operations"
        icon={<TrendingUp className="h-4 w-4" />}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Inventory Forecast"
            description="Predict demand & optimize"
            icon={<BarChart3 className="h-5 w-5" />}
            href="/wholesale/forecast"
            variant="primary"
          />
          <QuickActionCard
            title="Branch Management"
            description="Manage locations"
            icon={<Building2 className="h-5 w-5" />}
            href="/wholesale/branches"
            variant="info"
          />
          <QuickActionCard
            title="Branch Inventory"
            description="Stock by branch"
            icon={<BoxesIcon className="h-5 w-5" />}
            href="/wholesale/branch-inventory"
            variant="warning"
          />
          <QuickActionCard
            title="Retailer Orders"
            description="View all orders"
            icon={<FileText className="h-5 w-5" />}
            href="/wholesale/retailer-orders"
            variant="success"
          />
        </div>
      </DashboardSection>

      {/* Recent Orders */}
      <DashboardSection
        title="Recent Orders"
        description="Latest orders from retailers"
        icon={<Package className="h-4 w-4" />}
        action={{ label: "View All", href: "/wholesale/orders" }}
      >
        {orders.length === 0 ? (
          <EmptyStateCard
            icon={<Package className="h-6 w-6" />}
            title="No orders yet"
            description="When retailers place orders, they'll appear here"
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <ActivityCard
                key={order.id}
                title={`Order #${order.order_number || order.id.slice(0, 8)}`}
                subtitle={order.pharmacy_name || 'Unknown Retailer'}
                timestamp={new Date(order.created_at).toLocaleDateString()}
                status={{
                  label: order.status?.replace(/-/g, ' ').toUpperCase() || 'PENDING',
                  variant: getStatusVariant(order.status),
                }}
                icon={<Package className="h-5 w-5" />}
                rightContent={
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(order.total_amount)}
                  </span>
                }
              />
            ))}
          </div>
        )}
      </DashboardSection>

      {/* Analytics Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-muted-foreground" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-muted-foreground" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)}M TZS`, 'Revenue']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              Order Trends (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.orderTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-muted-foreground" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-muted-foreground" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Generator */}
      <DashboardSection
        title="Operations"
        description="Manage deliveries and invoicing"
        icon={<Truck className="h-4 w-4" />}
      >
        <Tabs defaultValue="cod-orders" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cod-orders">COD Orders</TabsTrigger>
            <TabsTrigger value="invoices">Invoice Generator</TabsTrigger>
          </TabsList>
          <TabsContent value="cod-orders" className="mt-4">
            <WholesaleCODOrders />
          </TabsContent>
          <TabsContent value="invoices" className="mt-4">
            <InvoiceGenerator />
          </TabsContent>
        </Tabs>
      </DashboardSection>
    </DashboardLayout>
  );
};

export default WholesaleDashboard;
