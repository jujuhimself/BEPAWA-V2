
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown,
  Package, 
  AlertTriangle, 
  ShoppingCart, 
  Users,
  DollarSign,
  Clock,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionStatusCard } from "@/components/subscription/SubscriptionStatusCard";

const GrowthCardInline = ({ userId }: { userId?: string }) => {
  const [growth, setGrowth] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const { data: thisMonth } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('user_id', userId)
        .gte('created_at', thisMonthStart.toISOString());

      const { data: lastMonth } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('user_id', userId)
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString());

      const thisRev = (thisMonth || []).reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const lastRev = (lastMonth || []).reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const pct = lastRev > 0 ? ((thisRev - lastRev) / lastRev) * 100 : (thisRev > 0 ? 100 : 0);
      setGrowth(pct);
    })();
  }, [userId]);

  const isPositive = (growth || 0) >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Growth</CardTitle>
        {isPositive ? <TrendingUp className="h-4 w-4 text-muted-foreground" /> : <TrendingDown className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          {growth !== null ? `${isPositive ? '+' : ''}${growth.toFixed(1)}%` : '—'}
        </div>
        <p className="text-xs text-muted-foreground">
          vs last month
        </p>
      </CardContent>
    </Card>
  );
};

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: number;
  todaySales: number;
  totalOrders: number;
  activeStaff: number;
  pendingOrders: number;
}

interface TopProduct {
  id: string;
  name: string;
  category: string;
  quantity_sold: number;
  revenue: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  customer_name?: string;
}

const RetailDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockProducts: 0,
    todaySales: 0,
    totalOrders: 0,
    activeStaff: 0,
    pendingOrders: 0
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch products stats
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id);

      const totalProducts = products?.length || 0;
      const lowStockProducts = products?.filter(p => p.stock <= p.min_stock_level).length || 0;

      // Fetch today's sales
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySalesData } = await supabase
        .from('pos_sales')
        .select('total_amount')
        .eq('user_id', user.id)
        .gte('created_at', today);

      const todaySales = todaySalesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

      // Fetch orders stats
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id);

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;

      // Fetch staff stats
      const { data: staff } = await supabase
        .from('staff_members')
        .select('*')
        .eq('pharmacy_id', user.id);

      const activeStaff = staff?.filter(s => s.is_active).length || 0;

      setStats({
        totalProducts,
        lowStockProducts,
        todaySales,
        totalOrders,
        activeStaff,
        pendingOrders
      });

      // Fetch top selling products (mock data since we don't have aggregation)
      const { data: posSales } = await supabase
        .from('pos_sale_items')
        .select(`
          product_id,
          quantity,
          total_price,
          products(name, category)
        `)
        .limit(100);

      // Group by product and calculate totals
      const productSales = posSales?.reduce((acc: any, item: any) => {
        const productId = item.product_id;
        if (!acc[productId]) {
          acc[productId] = {
            id: productId,
            name: item.products?.name || 'Unknown',
            category: item.products?.category || 'Unknown',
            quantity_sold: 0,
            revenue: 0
          };
        }
        acc[productId].quantity_sold += item.quantity;
        acc[productId].revenue += Number(item.total_price);
        return acc;
      }, {});

      const topProductsList = Object.values(productSales || {})
        .sort((a: any, b: any) => b.quantity_sold - a.quantity_sold)
        .slice(0, 5) as TopProduct[];

      setTopProducts(topProductsList);

      // Fetch recent orders
      const { data: recentOrdersData } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentOrders(recentOrdersData || []);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { variant: 'secondary' as const, icon: Clock },
      'processing': { variant: 'default' as const, icon: Package },
      'completed': { variant: 'default' as const, icon: CheckCircle },
      'cancelled': { variant: 'destructive' as const, icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['pending'];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Retail Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your pharmacy overview.</p>
      </div>

      {/* Subscription Status */}
      <SubscriptionStatusCard />

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.lowStockProducts} need restocking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">TZS {stats.todaySales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Revenue generated today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">
              Items requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingOrders} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStaff}</div>
            <p className="text-xs text-muted-foreground">
              Staff members active
            </p>
          </CardContent>
        </Card>

        <GrowthCardInline userId={user?.id} />
      </div>

      {/* Top Products and Recent Orders */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No sales data available</p>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-600">{product.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{product.quantity_sold} sold</div>
                      <div className="text-sm text-gray-600">TZS {product.revenue.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent orders</p>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-sm text-gray-600">
                        {order.customer_name || 'Walk-in Customer'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">TZS {Number(order.total_amount).toLocaleString()}</div>
                      <div className="mt-1">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RetailDashboard;
