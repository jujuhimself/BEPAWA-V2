import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsService } from '@/services/analyticsService';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  revenue: { period: string; amount: number; }[];
  orders: { period: string; count: number; }[];
  topProducts: { name: string; sales: number; revenue: number; }[];
  customerMetrics: { newCustomers: number; returningCustomers: number; totalCustomers: number; };
  inventoryTurnover: { product: string; turnoverRate: number; daysInStock: number; }[];
}

export const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [ordersData, setOrdersData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [customerMetrics, setCustomerMetrics] = useState<any>({ newCustomers: 0, returningCustomers: 0, totalCustomers: 0 });
  const [inventoryTurnover, setInventoryTurnover] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days + 1);
        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];

        let orderQuery = supabase.from('orders').select('*');
        if (user.role === 'retail') {
          orderQuery = orderQuery.eq('pharmacy_id', user.id);
        } else if (user.role === 'wholesale') {
          orderQuery = orderQuery.eq('wholesaler_id', user.id);
        }
        orderQuery = orderQuery.gte('created_at', start).lte('created_at', end).in('status', ['completed', 'paid']);
        const { data: orders, error: ordersError } = await orderQuery;
        if (ordersError) throw ordersError;
        const totalRevenue = (orders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        const totalOrders = (orders || []).length;
        setRevenueData([{ period: `${start} - ${end}`, amount: totalRevenue }]);
        setOrdersData([{ period: `${start} - ${end}`, count: totalOrders }]);
        setTopProducts([]);
        setCustomerMetrics({
          newCustomers: 0,
          returningCustomers: 0,
          totalCustomers: 0
        });
        setInventoryTurnover([]);
        const customers = await analyticsService.getCustomerAnalytics();
        setCustomerMetrics(metrics => ({ ...metrics, totalCustomers: customers.length }));
      } catch (err) {
        setError('Failed to load analytics. Please try again later.');
      }
      setLoading(false);
    })();
  }, [user, timeframe]);

  const revenueGrowth = revenueData.length > 1 ? (((revenueData[revenueData.length - 1].amount - revenueData[revenueData.length - 2].amount) / (revenueData[revenueData.length - 2].amount || 1)) * 100).toFixed(1) : '0';
  const orderGrowth = ordersData.length > 1 ? (((ordersData[ordersData.length - 1].count - ordersData[ordersData.length - 2].count) / (ordersData[ordersData.length - 2].count || 1)) * 100).toFixed(1) : '0';

  // Custom tooltip component for dark mode support
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground">
              {entry.name}: {entry.name === 'Revenue' ? `TZS ${Number(entry.value).toLocaleString()}` : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-40 bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  TZS {revenueData.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  {parseFloat(revenueGrowth) >= 0 ? (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {revenueGrowth}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {revenueGrowth}%
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {ordersData.reduce((sum, item) => sum + item.count, 0)}
                </p>
                <div className="flex items-center mt-2">
                  {parseFloat(orderGrowth) >= 0 ? (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {orderGrowth}%
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {orderGrowth}%
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Customers</p>
                <p className="text-2xl font-bold text-foreground mt-1">{customerMetrics.totalCustomers}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {customerMetrics.newCustomers} new this period
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Products Sold</p>
                <p className="text-2xl font-bold text-foreground mt-1">0</p>
                <p className="text-xs text-muted-foreground mt-2">
                  0 unique products
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Package className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="bg-muted/50 dark:bg-muted/30">
          <TabsTrigger value="revenue" className="data-[state=active]:bg-background">Revenue</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-background">Orders</TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-background">Top Products</TabsTrigger>
          <TabsTrigger value="inventory" className="data-[state=active]:bg-background">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : revenueData.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 bg-muted/30 dark:bg-muted/10 rounded-lg border-2 border-dashed border-border">
                  Revenue trend will appear here once you have sales data.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      name="Revenue"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Order Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : ordersData.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 bg-muted/30 dark:bg-muted/10 rounded-lg border-2 border-dashed border-border">
                  Order volume will appear here once you have order data.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ordersData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Top Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : topProducts.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 bg-muted/30 dark:bg-muted/10 rounded-lg border-2 border-dashed border-border">
                  Top products will appear here once you have product sales data.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Inventory Turnover</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : inventoryTurnover.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 bg-muted/30 dark:bg-muted/10 rounded-lg border-2 border-dashed border-border">
                  Inventory turnover will appear here once you have inventory movement data.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={inventoryTurnover}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="product" angle={-45} textAnchor="end" height={80} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="turnoverRate" name="Turnover Rate" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="text-center text-destructive py-4 bg-destructive/10 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};
