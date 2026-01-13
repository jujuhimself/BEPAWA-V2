import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Package, DollarSign, Users, TrendingUp, FileText, BarChart3, Calendar, FileSearch, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import BackupScheduleManager from "@/components/BackupScheduleManager";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { useReportTemplates, useGenerateReport, useGeneratedReports } from "@/hooks/useReporting";
import ReportModal from "@/components/ReportModal";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import InventoryForecasting from '@/components/inventory/InventoryForecasting';
import BarcodeScanner from '@/components/BarcodeScanner';

// Add the missing Button import here
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionStatusCard } from "@/components/subscription/SubscriptionStatusCard";

// Define type for orders
type WholesaleOrder = {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  status: string;
  pharmacy_id?: string;
  pharmacy_name?: string;
};

// Type for retail profile
type RetailerProfile = {
  id: string;
  name: string;
  business_name: string;
};

// Analytics data types
type AnalyticsData = {
  monthlyRevenue: any[];
  topProducts: any[];
  orderTrends: any[];
  retailerDistribution: any[];
};

// Import new components
import WholesaleStatsCards from "@/components/wholesale/WholesaleStatsCards";
import WholesaleQuickActions from "@/components/wholesale/WholesaleQuickActions";
import WholesaleRecentOrders from "@/components/wholesale/WholesaleRecentOrders";
import { InvoiceGenerator } from "@/components/invoice/InvoiceGenerator";

const WholesaleDashboard = () => {
  const { user, logout } = useAuth();
  const { selectedBranch } = useBranch();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeRetailers: 0,
    lowStockItems: 0
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    monthlyRevenue: [],
    topProducts: [],
    orderTrends: [],
    retailerDistribution: []
  });

  // Automated Reporting
  const { data: reportTemplates } = useReportTemplates();
  const { mutate: generateReport, isPending } = useGenerateReport();
  const { data: generatedReports, isLoading: loadingReports } = useGeneratedReports();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const { toast } = useToast();

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Helper: load orders, stats, retailers
  useEffect(() => {
    if (!user || user.role !== 'wholesale') {
      navigate('/login');
      return;
    }

    // Fetch orders from Supabase by wholesaler_id
    async function fetchWholesaleData() {
      // 1. Orders
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, order_number, created_at, total_amount, status, pharmacy_id')
        .eq('wholesaler_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (orderError) {
        setOrders([]); // fallback
        return;
      }

      // Fetch pharmacy names for display (batch query)
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

      // 2. Stats - aggregate from all orders for this wholesaler
      const { data: allOrders } = await supabase
        .from('orders')
        .select('id, total_amount, pharmacy_id')
        .eq('wholesaler_id', user.id);

      const totalRevenue = (allOrders || []).reduce((sum: number, ord: any) => sum + Number(ord.total_amount || 0), 0);
      const totalOrders = (allOrders || []).length || 0;
      const activeRetailers = new Set((allOrders || []).map((o: any) => o.pharmacy_id)).size;

      // Count low stock items
      let lowStockItems = 0;
      const { data: productData } = await supabase
        .from('products')
        .select('id, stock, min_stock_level')
        .eq('wholesaler_id', user.id);

      if (productData) {
        lowStockItems = productData.filter((prod: any) => Number(prod.stock) <= Number(prod.min_stock)).length;
      }

      setStats({
        totalRevenue,
        totalOrders,
        activeRetailers,
        lowStockItems
      });

      // 3. Generate analytics data from real data
      const monthlyRevenue = await generateMonthlyRevenueData(allOrders || []);
      const topProducts = await generateTopProductsData(user.id);
      const orderTrends = await generateOrderTrendsData(allOrders || []);
      const retailerDistribution = await generateRetailerDistributionData(allOrders || []);

      setAnalyticsData({
        monthlyRevenue,
        topProducts,
        orderTrends,
        retailerDistribution
      });
    }

    fetchWholesaleData();
  }, [user, navigate]);

  // Helper functions to generate real analytics data
  const generateMonthlyRevenueData = async (orders: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    const monthlyData = months.map((month, index) => {
      const monthOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.created_at);
        return orderDate.getFullYear() === currentYear && orderDate.getMonth() === index;
      });
      
      const revenue = monthOrders.reduce((sum: number, order: any) => sum + Number(order.total_amount || 0), 0);
      
      return {
        month,
        revenue: revenue / 1000000, // Convert to millions
        orders: monthOrders.length
      };
    });

    return monthlyData;
  };

  const generateTopProductsData = async (wholesalerId: string) => {
    // Fetch order items with product information, join to orders for wholesaler_id
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        product_name,
        quantity,
        unit_price,
        total_price,
        order_id,
        orders!inner(wholesaler_id)
      `)
      .eq('orders.wholesaler_id', wholesalerId);

    if (!orderItems) return [];

    // Group by product and calculate totals
    const productTotals: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    orderItems.forEach((item: any) => {
      const productName = item.product_name || 'Unknown Product';
      if (!productTotals[productName]) {
        productTotals[productName] = { name: productName, quantity: 0, revenue: 0 };
      }
      productTotals[productName].quantity += Number(item.quantity || 0);
      productTotals[productName].revenue += Number(item.total_price || 0);
    });

    // Convert to array and sort by revenue
    return Object.values(productTotals)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((product, index) => ({
        name: product.name,
        value: product.revenue / 1000000, // Convert to millions
        quantity: product.quantity,
        color: COLORS[index % COLORS.length]
      }));
  };

  const generateOrderTrendsData = async (orders: any[]) => {
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

  const generateRetailerDistributionData = async (orders: any[]) => {
    const retailerCounts: Record<string, number> = {};
    
    orders.forEach((order: any) => {
      const retailerId = order.pharmacy_id;
      if (retailerId) {
        retailerCounts[retailerId] = (retailerCounts[retailerId] || 0) + 1;
      }
    });

    // Fetch retailer names
    const retailerIds = Object.keys(retailerCounts);
    let retailerNames: Record<string, string> = {};
    
    if (retailerIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, business_name, name')
        .in('id', retailerIds);

      profileData?.forEach((profile: any) => {
        retailerNames[profile.id] = profile.business_name || profile.name || 'Unknown Retailer';
      });
    }

    return Object.entries(retailerCounts)
      .map(([id, count]) => ({
        name: retailerNames[id] || 'Unknown Retailer',
        value: count,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const handleDownload = async (file_path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('reports')
        .download(file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file_path.split('/').pop() || 'report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReport = async (templateId: string) => {
    generateReport({ templateId }, {
      onSuccess: () => {
        toast({
          title: "Report Generated",
          description: "Your report has been generated successfully.",
        });
        setReportModalOpen(false);
      },
      onError: (error) => {
        toast({
          title: "Generation Failed",
          description: error.message || "Failed to generate report.",
          variant: "destructive",
        });
      },
    });
  };

  if (!user || user.role !== 'wholesale') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Wholesale Dashboard
            {selectedBranch && (
              <span className="text-2xl font-normal text-gray-600 ml-4">
                - {selectedBranch.name}
              </span>
            )}
          </h1>
          <p className="text-gray-600 text-lg">
            Manage your wholesale operations and track performance
            {selectedBranch && ` for ${selectedBranch.name}`}
          </p>
        </div>


        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link to="/wholesale/forecast">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <span role="img" aria-label="Forecast">📈</span> Inventory Forecasting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Predict demand and optimize inventory management across all branches.</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/wholesale/branches">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <span role="img" aria-label="Branches">🏢</span> Branch Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Manage your branches, add new locations, and assign managers.</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/wholesale/branch-inventory">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <span role="img" aria-label="Inventory">📦</span> Branch Inventory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Manage inventory for the selected branch.</p>
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
                  <p className="text-gray-600">Scan product barcodes to quickly manage inventory across branches.</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-2xl w-full">
              <BarcodeScanner />
            </DialogContent>
          </Dialog>
        </div>

        <WholesaleStatsCards stats={stats} />
        <WholesaleQuickActions />
        <WholesaleRecentOrders orders={orders} />

        {/* Invoice Generator Section */}
        <div className="mb-8">
          <InvoiceGenerator />
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}M`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Order Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order Trends (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.orderTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Products and Retailer Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Top Products by Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.topProducts}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}M`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Retailer Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Retailers by Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.retailerDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.retailerDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Orders']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Automated Reporting */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Automated Reporting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Report Templates */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Available Report Templates</h3>
                <div className="space-y-3">
                  {reportTemplates?.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                      <Button
                        onClick={() => handleGenerateReport(template.id)}
                        disabled={isPending}
                        size="sm"
                      >
                        {isPending ? 'Generating...' : 'Generate'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Reports */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Generated Reports</h3>
                <div className="space-y-3">
                  {loadingReports ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="text-sm text-gray-600 mt-2">Loading reports...</p>
                    </div>
                  ) : generatedReports?.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No reports generated yet.</p>
                  ) : (
                    generatedReports?.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{report.file_path.split('/').pop()}</h4>
                          <p className="text-sm text-gray-600">
                            Generated: {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleDownload(report.file_path)}
                          size="sm"
                          variant="outline"
                        >
                          Download
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backup Schedule Manager */}
        <BackupScheduleManager />
      </div>

      {/* Report Generation Modal */}
      <ReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        templates={reportTemplates || []}
        onGenerateReport={({ templateId }) => handleGenerateReport(templateId)}
        isLoading={isPending}
      />
    </div>
  );
};

export default WholesaleDashboard;
