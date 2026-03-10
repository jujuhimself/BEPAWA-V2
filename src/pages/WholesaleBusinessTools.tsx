import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Package, 
  DollarSign, 
  Users, 
  Truck, 
  Bell,
  Settings,
  TrendingUp,
  ShoppingCart,
  FileText,
  Shield,
  Database,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Import Business Operations Hub components
import BarcodeScanner from "@/components/BarcodeScanner";
import FinancialManagement from "@/components/FinancialManagement";
import CustomerRelationshipManagement from "@/components/CustomerRelationshipManagement";
import NotificationManagement from "@/components/NotificationManagement";

const formatCurrency = (amount: number) =>
  `TZS ${amount.toLocaleString()}`;

const WholesaleBusinessTools = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    revenueGrowth: 0,
    activeOrders: 0,
    retailerPartners: 0,
    lowStockItems: 0,
  });

  useEffect(() => {
    if (!user?.id) return;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const orgId = user.id;

        // Revenue from POS sales
        const { data: sales } = await supabase
          .from('pos_sales')
          .select('total_amount')
          .eq('user_id', orgId);
        const posRevenue = (sales || []).reduce((s: number, r: any) => s + (r.total_amount || 0), 0);

        // Revenue from completed orders where user is provider
        const { data: orders } = await supabase
          .from('orders')
          .select('total_amount, user_id, status')
          .or(`pharmacy_id.eq.${orgId},wholesaler_id.eq.${orgId}`);
        const orderRevenue = (orders || [])
          .filter((o: any) => ['completed', 'paid', 'delivered', 'delivered_and_paid'].includes(o.status))
          .reduce((s: number, o: any) => s + (o.total_amount || 0), 0);

        const activeOrders = (orders || [])
          .filter((o: any) => ['pending', 'processing', 'confirmed'].includes(o.status)).length;

        const partnerIds = new Set((orders || []).map((o: any) => o.user_id).filter(Boolean));

        // Low stock
        const { count: lowStock } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', orgId)
          .lte('stock', 10); // fallback threshold

        setStats({
          totalRevenue: posRevenue + orderRevenue,
          revenueGrowth: 0,
          activeOrders,
          retailerPartners: partnerIds.size,
          lowStockItems: lowStock || 0,
        });
      } catch (e) {
        console.error('Stats fetch error', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user?.id]);

  const tools = [
    {
      id: "advanced-inventory",
      title: "Advanced Inventory",
      description: "Barcode scanning, stock alerts, and inventory optimization",
      icon: Package,
      color: "bg-blue-500",
      tab: "inventory"
    },
    {
      id: "financial-management",
      title: "Financial Management",
      description: "Revenue tracking, expense management, and financial reporting",
      icon: DollarSign,
      color: "bg-green-500",
      tab: "financial"
    },
    {
      id: "customer-management",
      title: "Customer Management",
      description: "CRM, customer communications, and relationship tracking",
      icon: Users,
      color: "bg-purple-500",
      tab: "customers"
    },
    {
      id: "delivery-tracking",
      title: "Delivery Tracking",
      description: "Order tracking, delivery status, and logistics management",
      icon: Truck,
      color: "bg-orange-500",
      tab: "delivery"
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "System alerts, customer notifications, and communication",
      icon: Bell,
      color: "bg-red-500",
      tab: "notifications"
    },
    {
      id: "analytics",
      title: "Business Analytics",
      description: "Performance metrics, trends, and business intelligence",
      icon: BarChart3,
      color: "bg-indigo-500",
      tab: "analytics"
    }
  ];

  const handleToolClick = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Business Operations Hub
          </h1>
          <p className="text-lg text-gray-600">
            Comprehensive tools for managing your wholesale operations
          </p>
          <Badge variant="secondary" className="mt-2">
            Wholesale Dashboard
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                  <Card 
                    key={tool.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer group"
                    onClick={() => handleToolClick(tool.tab)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${tool.color} text-white`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-lg">{tool.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        {tool.description}
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                      >
                        Open Tool
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Quick Stats - Live Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Total Revenue</span>
                  </div>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mt-2" /> : (
                    <>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                      <p className="text-xs text-muted-foreground">{stats.revenueGrowth >= 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}% from last month</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Active Orders</span>
                  </div>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mt-2" /> : (
                    <p className="text-2xl font-bold text-blue-600">{stats.activeOrders}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Retailer Partners</span>
                  </div>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mt-2" /> : (
                    <p className="text-2xl font-bold text-purple-600">{stats.retailerPartners}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Low Stock Items</span>
                  </div>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mt-2" /> : (
                    <>
                      <p className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</p>
                      <p className="text-xs text-muted-foreground">Need reordering</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Advanced Inventory Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarcodeScanner />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Financial Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FinancialManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Customer Relationship Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CustomerRelationshipManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="h-5 w-5" />
                  <span>Delivery Tracking</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">In Transit</span>
                        </div>
                        <p className="text-2xl font-bold">23</p>
                        <p className="text-xs text-gray-500">Orders being delivered</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm font-medium">Pending</span>
                        </div>
                        <p className="text-2xl font-bold">8</p>
                        <p className="text-xs text-gray-500">Awaiting pickup</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium">Delivered</span>
                        </div>
                        <p className="text-2xl font-bold">156</p>
                        <p className="text-xs text-gray-500">This month</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Recent Deliveries</h3>
                    <div className="space-y-2">
                      {[
                        { id: 1, order: "ORD-2024-001", retailer: "City Pharmacy", status: "Delivered", date: "2024-01-15" },
                        { id: 2, order: "ORD-2024-002", retailer: "Health Plus", status: "In Transit", date: "2024-01-16" },
                        { id: 3, order: "ORD-2024-003", retailer: "MediCare", status: "Pending", date: "2024-01-17" }
                      ].map((delivery) => (
                        <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{delivery.order}</p>
                            <p className="text-sm text-gray-500">{delivery.retailer}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={delivery.status === "Delivered" ? "default" : delivery.status === "In Transit" ? "secondary" : "outline"}>
                              {delivery.status}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">{delivery.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notification Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <NotificationManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Business Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Revenue Growth</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">+23%</p>
                        <p className="text-xs text-gray-500">vs last quarter</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">New Partners</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">+12</p>
                        <p className="text-xs text-gray-500">This month</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <ShoppingCart className="h-4 w-4 text-purple-500" />
                          <span className="text-sm font-medium">Order Volume</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">+18%</p>
                        <p className="text-xs text-gray-500">vs last month</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Package className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium">Inventory Turnover</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-600">4.2x</p>
                        <p className="text-xs text-gray-500">Annual rate</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Top Performing Products</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[
                            { name: "Paracetamol 500mg", sales: 12500, growth: "+15%" },
                            { name: "Amoxicillin 250mg", sales: 8900, growth: "+8%" },
                            { name: "Ibuprofen 400mg", sales: 7200, growth: "+12%" },
                            { name: "Vitamin C 1000mg", sales: 6800, growth: "+22%" }
                          ].map((product, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-gray-500">TZS {product.sales.toLocaleString()}</p>
                              </div>
                              <Badge variant="secondary">{product.growth}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Top Retailer Partners</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[
                            { name: "City Pharmacy", orders: 156, revenue: "TZS 2.3M" },
                            { name: "Health Plus", orders: 134, revenue: "TZS 1.9M" },
                            { name: "MediCare", orders: 98, revenue: "TZS 1.4M" },
                            { name: "PharmaCare", orders: 87, revenue: "TZS 1.2M" }
                          ].map((retailer, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{retailer.name}</p>
                                <p className="text-sm text-gray-500">{retailer.orders} orders</p>
                              </div>
                              <p className="font-semibold text-green-600">{retailer.revenue}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WholesaleBusinessTools;
