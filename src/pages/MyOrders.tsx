import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Clock, 
  MapPin, 
  Phone, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Navigation
} from 'lucide-react';
import { format } from 'date-fns';
import { COD_ORDER_STATUSES, deliveryService } from '@/services/deliveryService';
import PageHeader from '@/components/PageHeader';
import DeliveryTrackingMap from '@/components/delivery/DeliveryTrackingMap';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  items: any[];
  delivery_address: string;
  delivery_phone: string;
  delivery_notes: string;
  created_at: string;
  updated_at: string;
  rider_id?: string;
  pharmacy_id?: string;
  pharmacy?: {
    id: string;
    pharmacy_name: string;
    address: string;
    phone: string;
  };
  rider?: {
    id: string;
    name: string;
    phone: string;
  };
}

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // Fetch orders without FK joins (no foreign keys exist on orders table)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'cart')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related profiles for pharmacy and rider data
      const pharmacyIds = [...new Set((data || []).map((o: any) => o.pharmacy_id).filter(Boolean))];
      const riderIds = [...new Set((data || []).map((o: any) => o.rider_id).filter(Boolean))];
      const allProfileIds = [...new Set([...pharmacyIds, ...riderIds])];

      let profilesMap: Record<string, any> = {};
      if (allProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, phone, address, pharmacy_name')
          .in('id', allProfileIds);
        
        profilesMap = (profiles || []).reduce((acc: Record<string, any>, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
      
      const ordersWithParsedItems = (data || []).map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items : JSON.parse(String(order.items) || '[]'),
        pharmacy: profilesMap[order.pharmacy_id] || null,
        rider: profilesMap[order.rider_id] || null,
      }));
      
      setOrders(ordersWithParsedItems);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    
    // Set up real-time subscription for order updates
    const channel = supabase
      .channel('my-orders-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('Order update received:', payload);
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode; step: number }> = {
      [COD_ORDER_STATUSES.PENDING_PHARMACY_CONFIRMATION]: { 
        label: 'Waiting for Pharmacy', 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: <Clock className="h-4 w-4" />,
        step: 1
      },
      [COD_ORDER_STATUSES.PREPARING_ORDER]: { 
        label: 'Being Prepared', 
        color: 'bg-blue-100 text-blue-800', 
        icon: <Package className="h-4 w-4" />,
        step: 2
      },
      [COD_ORDER_STATUSES.AWAITING_RIDER]: { 
        label: 'Ready for Pickup', 
        color: 'bg-purple-100 text-purple-800', 
        icon: <Package className="h-4 w-4" />,
        step: 3
      },
      [COD_ORDER_STATUSES.RIDER_ASSIGNED]: { 
        label: 'Rider Assigned', 
        color: 'bg-indigo-100 text-indigo-800', 
        icon: <Truck className="h-4 w-4" />,
        step: 4
      },
      [COD_ORDER_STATUSES.OUT_FOR_DELIVERY]: { 
        label: 'Out for Delivery', 
        color: 'bg-orange-100 text-orange-800', 
        icon: <Truck className="h-4 w-4" />,
        step: 5
      },
      [COD_ORDER_STATUSES.DELIVERED_AND_PAID]: { 
        label: 'Delivered', 
        color: 'bg-green-100 text-green-800', 
        icon: <CheckCircle2 className="h-4 w-4" />,
        step: 6
      },
      [COD_ORDER_STATUSES.DELIVERY_FAILED]: { 
        label: 'Delivery Failed', 
        color: 'bg-red-100 text-red-800', 
        icon: <XCircle className="h-4 w-4" />,
        step: 0
      },
      [COD_ORDER_STATUSES.CANCELLED]: { 
        label: 'Cancelled', 
        color: 'bg-gray-100 text-gray-800', 
        icon: <XCircle className="h-4 w-4" />,
        step: 0
      },
      'pending': { 
        label: 'Pending', 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: <Clock className="h-4 w-4" />,
        step: 1
      },
      'completed': { 
        label: 'Completed', 
        color: 'bg-green-100 text-green-800', 
        icon: <CheckCircle2 className="h-4 w-4" />,
        step: 6
      },
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: <Package className="h-4 w-4" />, step: 0 };
  };

  const isActiveOrder = (status: string) => {
    const activeStatuses = [
      COD_ORDER_STATUSES.PENDING_PHARMACY_CONFIRMATION,
      COD_ORDER_STATUSES.PREPARING_ORDER,
      COD_ORDER_STATUSES.AWAITING_RIDER,
      COD_ORDER_STATUSES.RIDER_ASSIGNED,
      COD_ORDER_STATUSES.OUT_FOR_DELIVERY,
      'pending'
    ];
    return activeStatuses.includes(status);
  };

  const activeOrders = orders.filter(order => isActiveOrder(order.status));
  const completedOrders = orders.filter(order => !isActiveOrder(order.status));

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const OrderStatusProgress = ({ status }: { status: string }) => {
    const { step } = getStatusInfo(status);
    const steps = [
      { label: 'Placed', step: 1 },
      { label: 'Accepted', step: 2 },
      { label: 'Ready', step: 3 },
      { label: 'Rider', step: 4 },
      { label: 'On Way', step: 5 },
      { label: 'Delivered', step: 6 },
    ];

    return (
      <div className="flex items-center justify-between mt-4">
        {steps.map((s, idx) => (
          <div key={s.step} className="flex flex-col items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              step >= s.step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {step >= s.step ? '✓' : s.step}
            </div>
            <span className="text-xs mt-1 text-muted-foreground text-center">{s.label}</span>
            {idx < steps.length - 1 && (
              <div className={`absolute h-1 w-[calc(100%/6-1rem)] left-1/2 top-4 ${
                step > s.step ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const statusInfo = getStatusInfo(order.status);
    const isExpanded = expandedOrder === order.id;
    const showTracking = order.status === COD_ORDER_STATUSES.OUT_FOR_DELIVERY && order.rider_id;

    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleOrderExpanded(order.id)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {statusInfo.icon}
              </div>
              <div>
                <CardTitle className="text-base">Order #{order.order_number}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(order.created_at), 'PPp')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress tracker for active orders */}
          {isActiveOrder(order.status) && (
            <div className="relative">
              <OrderStatusProgress status={order.status} />
            </div>
          )}

          {/* Order summary */}
          <div className="flex justify-between items-center py-2 border-t">
            <span className="text-sm">{order.items?.length || 0} item(s)</span>
            <span className="font-semibold">TZS {order.total_amount?.toLocaleString()}</span>
          </div>

          {/* Expanded details */}
          {isExpanded && (
            <div className="space-y-4 pt-2 border-t">
              {/* Items list */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Items:</p>
                {order.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm bg-muted/50 p-2 rounded">
                    <span>{item.name || item.product_name} x{item.quantity}</span>
                    <span>TZS {((item.price || item.sell_price || 0) * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Delivery info */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Delivery Details:</p>
                <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <span>{order.delivery_address || 'No address provided'}</span>
                  </div>
                  {order.delivery_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{order.delivery_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pharmacy info */}
              {order.pharmacy && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pharmacy:</p>
                  <div className="bg-blue-50 p-3 rounded-lg space-y-1">
                    <p className="font-medium">{order.pharmacy.pharmacy_name}</p>
                    <p className="text-sm text-muted-foreground">{order.pharmacy.address}</p>
                    {order.pharmacy.phone && (
                      <a href={`tel:${order.pharmacy.phone}`} className="text-sm text-primary flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {order.pharmacy.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Rider info */}
              {order.rider && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Delivery Rider:</p>
                  <div className="bg-green-50 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {order.rider.name}
                      </p>
                      {order.rider.phone && (
                        <a href={`tel:${order.rider.phone}`} className="text-sm text-primary flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.rider.phone}
                        </a>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`tel:${order.rider?.phone}`, '_blank');
                      }}
                    >
                      Call Rider
                    </Button>
                  </div>
                </div>
              )}

              {/* Live tracking map for out for delivery */}
              {showTracking && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Live Tracking
                  </p>
                  <DeliveryTrackingMap
                    orderId={order.id}
                    riderId={order.rider_id!}
                    deliveryAddress={order.delivery_address}
                    pickupAddress={order.pharmacy?.address}
                  />
                </div>
              )}

              {/* Payment info */}
              <div className="flex justify-between items-center bg-yellow-50 p-3 rounded-lg">
                <span className="text-sm font-medium">Payment Method:</span>
                <Badge variant="outline" className="bg-white">
                  {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading your orders...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <PageHeader
            title="My Orders"
            description="Track your orders and view order history"
          />
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Orders Yet</h3>
              <p className="text-muted-foreground mb-4">
                When you place your first order, it will appear here.
              </p>
              <Button onClick={() => window.location.href = '/catalog'}>
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Active ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                History ({completedOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              {activeOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No active orders</p>
                  </CardContent>
                </Card>
              ) : (
                activeOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No completed orders yet</p>
                  </CardContent>
                </Card>
              ) : (
                completedOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
