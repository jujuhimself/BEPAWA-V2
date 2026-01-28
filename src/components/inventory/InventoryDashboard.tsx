
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  ShoppingCart,
  DollarSign,
  Activity,
  Upload,
  QrCode
} from "lucide-react";
import BulkProductImport from './BulkProductImport';
import BarcodeManager from './BarcodeManager';
import { useProducts, useLowStockProducts, useExpiringProducts, useSalesAnalytics } from "@/hooks/useInventory";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const InventoryDashboard = () => {
  const { user } = useAuth();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: lowStockProducts = [] } = useLowStockProducts();
  const { data: expiringProducts = [] } = useExpiringProducts();
  const { data: salesData = [] } = useSalesAnalytics();

  // Debug logging
  console.log('InventoryDashboard - User role:', user?.role);
  console.log('InventoryDashboard - Products loading:', productsLoading);
  console.log('InventoryDashboard - Products count:', products.length);

  const totalValue = products.reduce((sum, product) => sum + (product.stock * product.buy_price), 0);
  const totalProfit = products.reduce((sum, product) => sum + (product.stock * (product.sell_price - product.buy_price)), 0);
  
  const todaySales = salesData.find(s => s.date === new Date().toISOString().split('T')[0]);

  const statsCards = [
    {
      title: "Total Products",
      value: products.length,
      icon: <Package className="h-6 w-6" />,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Low Stock Alerts",
      value: lowStockProducts.length,
      icon: <AlertTriangle className="h-6 w-6" />,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      title: "Expiring Soon",
      value: expiringProducts.length,
      icon: <Calendar className="h-6 w-6" />,
      color: "text-red-600",
      bgColor: "bg-red-100"
    },
    {
      title: "Inventory Value",
      value: `TZS ${totalValue.toLocaleString()}`,
      icon: <DollarSign className="h-6 w-6" />,
      color: "text-green-600",
      bgColor: "bg-green-100"
    }
  ];

  if (productsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="shadow-lg border-0 hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <div className={stat.color}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild className="h-20 flex-col">
              <Link to="/inventory-management">
                <Package className="h-6 w-6 mb-2" />
                Manage Products
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link to="/purchase-orders">
                <ShoppingCart className="h-6 w-6 mb-2" />
                Purchase Orders
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link to="/suppliers">
                <TrendingUp className="h-6 w-6 mb-2" />
                Manage Suppliers
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-20 flex-col">
              <Link to="/inventory-reports">
                <Activity className="h-6 w-6 mb-2" />
                View Reports
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts, Analytics, Bulk Import, and Barcodes */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="bulk-import" className="flex items-center gap-1">
            <Upload className="h-3 w-3" />
            Bulk Import
          </TabsTrigger>
          <TabsTrigger value="barcodes" className="flex items-center gap-1">
            <QrCode className="h-3 w-3" />
            Barcodes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Low Stock Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                  Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lowStockProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No low stock items</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {lowStockProducts.slice(0, 5).map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50">
                        <div>
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-gray-600">
                            Stock: {product.stock} | Min: {product.min_stock}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          {product.status.replace('-', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expiring Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-red-500" />
                  Expiring Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expiringProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No expiring products</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {expiringProducts.slice(0, 5).map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                        <div>
                          <h4 className="font-medium">{product.name}</h4>
                          <p className="text-sm text-gray-600">
                            Expires: {product.expiry_date}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          Expiring
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Today's Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Sales:</span>
                    <span className="font-medium text-green-600">
                      TZS {todaySales?.total_sales?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Orders:</span>
                    <span className="font-medium">{todaySales?.total_orders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Order Value:</span>
                    <span className="font-medium">
                      TZS {todaySales?.average_order_value?.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Value:</span>
                    <span className="font-medium text-blue-600">
                      TZS {totalValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Potential Profit:</span>
                    <span className="font-medium text-green-600">
                      TZS {totalProfit.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Products:</span>
                    <span className="font-medium">{products.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk-import">
          <BulkProductImport />
        </TabsContent>

        <TabsContent value="barcodes">
          <BarcodeManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryDashboard;
