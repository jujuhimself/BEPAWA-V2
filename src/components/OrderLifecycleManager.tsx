import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  MapPin,
  Phone,
  User,
  Calendar,
  DollarSign
} from "lucide-react";
// Removed: import { Order, MockDataService } from "@/services/mockDataService";
import { useToast } from "@/hooks/use-toast";

// Add Order TS type (partial, minimal) for build
type Order = {
  id: string;
  status: string;
  pharmacyName: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  urgency?: string;
  shippingAddress: string;
  trackingNumber?: string;
  supplierInfo?: { name: string; contact?: string; };
  items: Array<{ name: string; sku?: string; quantity: number; price: number }>;
  deliveryDate?: string;
  notes?: string;
  updatedAt: string;
};

interface OrderLifecycleManagerProps {
  order: Order;
  onStatusUpdate?: (orderId: string, newStatus: Order['status']) => void;
}

const OrderLifecycleManager = ({ order, onStatusUpdate }: OrderLifecycleManagerProps) => {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<Order['status']>(order.status);
  const [notes, setNotes] = useState("");

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
    { value: 'pending_pharmacy_confirmation', label: 'Pending Confirmation', color: 'bg-yellow-500' },
    { value: 'preparing_order', label: 'Preparing', color: 'bg-blue-500' },
    { value: 'awaiting_rider', label: 'Awaiting Rider', color: 'bg-purple-500' },
    { value: 'rider_assigned', label: 'Rider Assigned', color: 'bg-indigo-500' },
    { value: 'out_for_delivery', label: 'Out for Delivery', color: 'bg-orange-500' },
    { value: 'delivered_and_paid', label: 'Delivered & Paid', color: 'bg-green-500' },
    { value: 'delivery_failed', label: 'Delivery Failed', color: 'bg-red-500' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-500' },
    { value: 'packed', label: 'Packed', color: 'bg-purple-500' },
    { value: 'shipped', label: 'Shipped', color: 'bg-orange-500' },
    { value: 'out-for-delivery', label: 'Out for Delivery', color: 'bg-indigo-500' },
    { value: 'delivered', label: 'Delivered', color: 'bg-green-500' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' }
  ];

  const getStatusProgress = (status: string): number => {
    const progressMap: Record<string, number> = {
      'pending': 10,
      'pending_pharmacy_confirmation': 10,
      'preparing_order': 25,
      'awaiting_rider': 40,
      'rider_assigned': 55,
      'out_for_delivery': 75,
      'delivered_and_paid': 100,
      'delivery_failed': 0,
      'confirmed': 25,
      'packed': 50,
      'shipped': 70,
      'out-for-delivery': 85,
      'delivered': 100,
      'cancelled': 0
    };
    return progressMap[status] ?? 10;
  };

  const getStatusIcon = (status: string): React.ComponentType<{ className?: string }> => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      'pending': Clock,
      'pending_pharmacy_confirmation': Clock,
      'preparing_order': Package,
      'awaiting_rider': Clock,
      'rider_assigned': Truck,
      'out_for_delivery': Truck,
      'delivered_and_paid': CheckCircle,
      'delivery_failed': AlertTriangle,
      'confirmed': CheckCircle,
      'packed': Package,
      'shipped': Truck,
      'out-for-delivery': MapPin,
      'delivered': CheckCircle,
      'cancelled': AlertTriangle
    };
    return iconMap[status] ?? Package;
  };

  // Remove mock update and use callback only
  const handleStatusUpdate = () => {
    if (selectedStatus === order.status) {
      toast({
        title: "No Change",
        description: "Please select a different status to update.",
        variant: "destructive"
      });
      return;
    }

    // No actual order mutation (mock removed)
    onStatusUpdate?.(order.id, selectedStatus);

    toast({
      title: "Order Updated",
      description: `Order ${order.id} status changed to ${selectedStatus}`,
    });
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

  const StatusIcon = getStatusIcon(order.status);
  const currentStatusOption = statusOptions.find(opt => opt.value === order.status);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Package className="h-4 w-4 mr-1" />
          Manage Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <StatusIcon className="h-6 w-6" />
            Order {order.id} - {order.pharmacyName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Order Details */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Order ID:</span>
                  <span className="font-medium">{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Created:</span>
                  <span className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="font-bold text-lg">TZS {order.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Payment Method:</span>
                  <span className="font-medium">{order.paymentMethod.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Payment Status:</span>
                  <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                    {order.paymentStatus.toUpperCase()}
                  </Badge>
                </div>
                {order.urgency === 'urgent' && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Priority:</span>
                    <Badge variant="destructive">URGENT</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer & Shipping */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer & Shipping
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Pharmacy:</span>
                  <p className="font-medium">{order.pharmacyName}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Shipping Address:</span>
                  <p className="font-medium">{order.shippingAddress}</p>
                </div>
                {order.trackingNumber && (
                  <div>
                    <span className="text-sm text-gray-600">Tracking Number:</span>
                    <p className="font-medium">{order.trackingNumber}</p>
                  </div>
                )}
                {order.supplierInfo && (
                  <div>
                    <span className="text-sm text-gray-600">Supplier:</span>
                    <p className="font-medium">{order.supplierInfo.name}</p>
                    <p className="text-sm text-gray-500">{order.supplierInfo.contact}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Items ({order.items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Qty: {item.quantity}</p>
                        <p className="text-sm text-gray-600">
                          TZS {(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Management */}
          <div className="space-y-4">
            {/* Status Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Status Progress</span>
                    <span className="text-sm text-gray-600">{getStatusProgress(order.status)}%</span>
                  </div>
                  <Progress value={getStatusProgress(order.status)} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <span className="text-sm font-medium">Current Status:</span>
                  <Badge className={`${currentStatusOption?.color} text-white px-3 py-1`}>
                    {currentStatusOption?.label}
                  </Badge>
                </div>

                {order.deliveryDate && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Delivered On:</span>
                    <p className="text-sm">{new Date(order.deliveryDate).toLocaleString()}</p>
                  </div>
                )}

                {order.notes && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Notes:</span>
                    <p className="text-sm text-gray-600">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Update */}
            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Update Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">New Status</label>
                    <Select value={selectedStatus} onValueChange={(value: Order['status']) => setSelectedStatus(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions
                          .filter(option => option.value !== 'cancelled')
                          .map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                    <Textarea
                      placeholder="Add any notes about this status update..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={handleStatusUpdate}
                    className="w-full"
                    disabled={selectedStatus === order.status}
                  >
                    Update Order Status
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-1" />
                    Call Customer
                  </Button>
                  <Button variant="outline" size="sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    Track Delivery
                  </Button>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-1" />
                    Schedule Delivery
                  </Button>
                  <Button variant="outline" size="sm">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Process Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderLifecycleManager;
