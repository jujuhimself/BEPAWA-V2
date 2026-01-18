import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Clock, Search, Download, Eye, Plus, AlertTriangle, MapPin, Phone, User, Truck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import OrderLifecycleManager from "@/components/OrderLifecycleManager";
import CODOrderManager from "@/components/pharmacy/CODOrderManager";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { deliveryService } from '@/services/deliveryService';

// Update minimal Order fallback type to include COD fields
type Order = {
  id: string;
  order_number?: string;
  status: string;
  pharmacyName: string;
  createdAt: string;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  paymentStatus: string;
  paymentMethod: string;
  updatedAt: string;
  urgency?: string;
  trackingNumber?: string;
  shippingAddress: string;
  delivery_address?: string;
  delivery_phone?: string;
  rider?: any;
  customer?: any;
  // Raw order data for COD manager
  rawOrder?: any;
};

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [viewOrderDialog, setViewOrderDialog] = useState(false);
  const [selectedViewOrder, setSelectedViewOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    if (!user) return;
    
    // Fetch orders without FK joins (no foreign keys exist on orders table)
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select('*')
      .eq('pharmacy_id', user.id)
      .neq('status', 'cart')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
      return;
    }

    // Fetch related profiles for customer and rider data
    const userIds = [...new Set((ordersData || []).map((o: any) => o.user_id).filter(Boolean))];
    const riderIds = [...new Set((ordersData || []).map((o: any) => o.rider_id).filter(Boolean))];
    const allProfileIds = [...new Set([...userIds, ...riderIds])];

    let profilesMap: Record<string, any> = {};
    if (allProfileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, phone, address')
        .in('id', allProfileIds);
      
      profilesMap = (profiles || []).reduce((acc: Record<string, any>, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});
    }
    
    // Map to UI Order type
    setOrders((ordersData || []).map((order: any) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const customer = profilesMap[order.user_id];
      const rider = profilesMap[order.rider_id];
      
      return {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        pharmacyName: order.pharmacy_name || user.pharmacyName || '',
        createdAt: order.created_at,
        items: items.map((item: any) => ({
          name: item.product_name || item.name || '',
          sku: item.sku,
          quantity: item.quantity,
          price: item.unit_price || item.price || item.sell_price || 0,
        })),
        total: order.total_amount || 0,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        updatedAt: order.updated_at,
        urgency: order.urgency,
        trackingNumber: order.tracking_number,
        shippingAddress: order.shipping_address?.address || order.delivery_address || '',
        delivery_address: order.delivery_address,
        delivery_phone: order.delivery_phone,
        rider: rider,
        customer: customer,
        rawOrder: order,
      };
    }));
  };

  useEffect(() => {
    if (!user || user.role !== 'retail') {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const handleOrderStatusUpdate = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus, updatedAt: new Date().toISOString() }
        : order
    ));
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all") {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      switch (dateFilter) {
        case "today":
          matchesDate = orderDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = orderDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = orderDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'pending': 'bg-yellow-500 text-white',
      'pending_pharmacy_confirmation': 'bg-yellow-500 text-white',
      'preparing_order': 'bg-blue-500 text-white',
      'awaiting_rider': 'bg-purple-500 text-white',
      'rider_assigned': 'bg-indigo-500 text-white',
      'out_for_delivery': 'bg-orange-500 text-white',
      'delivered_and_paid': 'bg-green-500 text-white',
      'delivery_failed': 'bg-red-500 text-white',
      'confirmed': 'bg-blue-500 text-white',
      'packed': 'bg-purple-500 text-white',
      'shipped': 'bg-orange-500 text-white',
      'out-for-delivery': 'bg-indigo-500 text-white',
      'delivered': 'bg-green-500 text-white',
      'cancelled': 'bg-red-500 text-white',
    };
    return colorMap[status] || 'bg-gray-500 text-white';
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    active: orders.filter(o => ['confirmed', 'packed', 'shipped', 'out-for-delivery'].includes(o.status)).length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    totalValue: orders.reduce((sum, order) => sum + order.total, 0),
    urgent: orders.filter(o => o.urgency === 'urgent').length
  };

  const getTabOrders = (tab: string) => {
    switch (tab) {
      case 'pending':
        return filteredOrders.filter(o => o.status === 'pending');
      case 'active':
        return filteredOrders.filter(o => ['confirmed', 'packed', 'shipped', 'out-for-delivery'].includes(o.status));
      case 'completed':
        return filteredOrders.filter(o => o.status === 'delivered');
      default:
        return filteredOrders;
    }
  };

  // Helper to check if order contains HIV kit
  const isHivKitOrder = (order: Order) =>
    order.items.some(item => (item.name || '').toLowerCase().includes('hiv self-test kit'));

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar removed to avoid duplicate menu */}
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Order Management</h1>
          <p className="text-muted-foreground text-lg">Track and manage all your pharmacy orders</p>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid md:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orderStats.total}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-100">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orderStats.pending}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orderStats.active}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Delivered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orderStats.delivered}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">Urgent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orderStats.urgent}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-indigo-100">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">TZS {(orderStats.totalValue / 1000000).toFixed(1)}M</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="pending">Pending ({orderStats.pending})</TabsTrigger>
              <TabsTrigger value="active">Active ({orderStats.active})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({orderStats.delivered})</TabsTrigger>
            </TabsList>
            
            <Button onClick={() => navigate('/products')}>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="packed">Packed</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {['all', 'pending', 'active', 'completed'].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {tab === 'all' && 'All Orders'}
                    {tab === 'pending' && 'Pending Orders'}
                    {tab === 'active' && 'Active Orders'}
                    {tab === 'completed' && 'Completed Orders'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {getTabOrders(tab).length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-600 mb-2">No orders found</h3>
                      <p className="text-gray-500 mb-6">
                        {tab === 'all' && 'Start shopping to see your orders here'}
                        {tab === 'pending' && 'No pending orders at this time'}
                        {tab === 'active' && 'No active orders in progress'}
                        {tab === 'completed' && 'No completed orders yet'}
                      </p>
                      <Button onClick={() => navigate('/products')}>
                        Browse Products
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {getTabOrders(tab).map((order) => (
                        <div key={order.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-card">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-start gap-3">
                              <div className="p-3 bg-blue-100 dark:bg-blue-950/50 rounded-lg">
                                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-lg flex items-center gap-2">
                                    Order #{order.order_number || order.id.slice(0,8)}
                                    {order.paymentMethod?.toLowerCase() === 'cod' && (
                                      <Badge className="bg-orange-500 text-white text-xs">COD</Badge>
                                    )}
                                    {isHivKitOrder(order) && (
                                      <span className="inline-block bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded">HIV Kit</span>
                                    )}
                                  </p>
                                  {order.urgency === 'urgent' && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      URGENT
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground mb-1">{order.pharmacyName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {order.items.length} items • Created: {format(new Date(order.createdAt), 'PP')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                                TZS {order.total.toLocaleString()}
                              </div>
                              <p className="text-sm text-muted-foreground">Total Amount</p>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Order Status</p>
                              <Badge className={getStatusColor(order.status)}>
                                {deliveryService.getStatusLabel(order.status)}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment Status</p>
                              <Badge className={getPaymentStatusColor(order.paymentStatus || 'pending')}>
                                {(order.paymentStatus || 'pending').toUpperCase()}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment Method</p>
                              <p className="font-medium">{(order.paymentMethod || 'N/A').toUpperCase()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">Last Updated</p>
                              <p className="font-medium">{format(new Date(order.updatedAt), 'PP')}</p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="text-sm text-muted-foreground">
                              <p><strong>Items:</strong> {order.items.map(item => item.name).join(', ')}</p>
                              {order.trackingNumber && (
                                <p><strong>Tracking:</strong> {order.trackingNumber}</p>
                              )}
                              {order.delivery_address && (
                                <p className="flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {order.delivery_address}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedViewOrder(order);
                                  setViewOrderDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                              {order.paymentMethod?.toLowerCase() === 'cod' ? (
                                <CODOrderManager 
                                  order={{
                                    id: order.id,
                                    order_number: order.order_number,
                                    status: order.status,
                                    total_amount: order.total,
                                    payment_method: order.paymentMethod,
                                    payment_status: order.paymentStatus,
                                    delivery_address: order.delivery_address,
                                    delivery_phone: order.delivery_phone,
                                    created_at: order.createdAt,
                                    items: order.items,
                                    rider: order.rider,
                                    customer: order.customer,
                                  }}
                                  onStatusUpdate={(orderId, newStatus) => {
                                    handleOrderStatusUpdate(orderId, newStatus);
                                    fetchOrders(); // Refresh orders
                                  }}
                                />
                              ) : (
                                <OrderLifecycleManager 
                                  order={order} 
                                  onStatusUpdate={handleOrderStatusUpdate}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* View Order Details Dialog */}
        <Dialog open={viewOrderDialog} onOpenChange={setViewOrderDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            {selectedViewOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <p className="font-medium">{selectedViewOrder.order_number || selectedViewOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(selectedViewOrder.status)}>
                      {deliveryService.getStatusLabel(selectedViewOrder.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-bold text-lg">TZS {selectedViewOrder.total.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment</p>
                    <Badge className={getPaymentStatusColor(selectedViewOrder.paymentStatus)}>
                      {selectedViewOrder.paymentMethod?.toUpperCase()} - {selectedViewOrder.paymentStatus?.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{format(new Date(selectedViewOrder.createdAt), 'PPp')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Updated</p>
                    <p className="font-medium">{format(new Date(selectedViewOrder.updatedAt), 'PPp')}</p>
                  </div>
                </div>

                {(selectedViewOrder.delivery_address || selectedViewOrder.delivery_phone) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Delivery Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedViewOrder.delivery_address && (
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {selectedViewOrder.delivery_address}
                        </p>
                      )}
                      {selectedViewOrder.delivery_phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {selectedViewOrder.delivery_phone}
                        </p>
                      )}
                      {selectedViewOrder.customer && (
                        <p className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {selectedViewOrder.customer.name}
                        </p>
                      )}
                      {selectedViewOrder.rider && (
                        <div className="bg-indigo-50 dark:bg-indigo-950/50 p-2 rounded mt-2">
                          <p className="text-sm font-medium">Assigned Rider:</p>
                          <p>{selectedViewOrder.rider.name} - {selectedViewOrder.rider.phone}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Order Items ({selectedViewOrder.items.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedViewOrder.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                          </div>
                          <div className="text-right">
                            <p>x{item.quantity}</p>
                            <p className="text-sm text-muted-foreground">TZS {(item.price * item.quantity).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Orders;
