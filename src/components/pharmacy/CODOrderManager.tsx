import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  MapPin,
  Phone,
  User,
  DollarSign,
  X,
  Check
} from 'lucide-react';
import DeliveryTrackingMap from '@/components/delivery/DeliveryTrackingMap';
import { useToast } from '@/hooks/use-toast';
import { 
  useAcceptOrder, 
  useRejectOrder, 
  useMarkOrderReady,
  useRequestRider,
  useAvailableRiders 
} from '@/hooks/useDelivery';
import { deliveryService, COD_ORDER_STATUSES } from '@/services/deliveryService';
import { format } from 'date-fns';

interface CODOrderManagerProps {
  order: {
    id: string;
    order_number?: string;
    status: string;
    total_amount?: number;
    total?: number;
    payment_method?: string;
    paymentMethod?: string;
    payment_status?: string;
    paymentStatus?: string;
    delivery_address?: string;
    delivery_phone?: string;
    created_at?: string;
    createdAt?: string;
    items: any[];
    rider?: any;
    customer?: any;
  };
  onStatusUpdate?: (orderId: string, newStatus: string) => void;
}

const CODOrderManager: React.FC<CODOrderManagerProps> = ({ order, onStatusUpdate }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [riderDialogOpen, setRiderDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRider, setSelectedRider] = useState('');

  const { data: riders = [] } = useAvailableRiders();
  const acceptOrder = useAcceptOrder();
  const rejectOrder = useRejectOrder();
  const markReady = useMarkOrderReady();
  const requestRider = useRequestRider();

  const status = order.status;
  const isCOD = (order.payment_method || order.paymentMethod)?.toLowerCase() === 'cod';
  const orderNumber = order.order_number || order.id;
  const totalAmount = order.total_amount || order.total || 0;
  const createdAt = order.created_at || order.createdAt || new Date().toISOString();
  const items = Array.isArray(order.items) ? order.items : [];

  const handleAccept = () => {
    acceptOrder.mutate(order.id, {
      onSuccess: () => {
        onStatusUpdate?.(order.id, COD_ORDER_STATUSES.PREPARING_ORDER);
        setOpen(false);
      }
    });
  };

  const handleReject = () => {
    if (rejectReason) {
      rejectOrder.mutate({ orderId: order.id, reason: rejectReason }, {
        onSuccess: () => {
          onStatusUpdate?.(order.id, COD_ORDER_STATUSES.CANCELLED);
          setRejectDialogOpen(false);
          setRejectReason('');
          setOpen(false);
        }
      });
    }
  };

  const handleMarkReady = () => {
    markReady.mutate(order.id, {
      onSuccess: () => {
        onStatusUpdate?.(order.id, COD_ORDER_STATUSES.AWAITING_RIDER);
      }
    });
  };

  const handleAssignRider = () => {
    if (selectedRider) {
      requestRider.mutate({ orderId: order.id, riderId: selectedRider }, {
        onSuccess: () => {
          onStatusUpdate?.(order.id, COD_ORDER_STATUSES.RIDER_ASSIGNED);
          setRiderDialogOpen(false);
          setSelectedRider('');
        }
      });
    }
  };

  const getStatusProgress = (): number => {
    const progressMap: Record<string, number> = {
      'pending_pharmacy_confirmation': 10,
      'preparing_order': 30,
      'awaiting_rider': 50,
      'rider_assigned': 65,
      'out_for_delivery': 80,
      'delivered_and_paid': 100,
      'delivery_failed': 0,
      'cancelled': 0,
    };
    return progressMap[status] ?? 10;
  };

  const getStatusIcon = (): React.ComponentType<{ className?: string }> => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
      'pending_pharmacy_confirmation': Clock,
      'preparing_order': Package,
      'awaiting_rider': Clock,
      'rider_assigned': Truck,
      'out_for_delivery': Truck,
      'delivered_and_paid': CheckCircle,
      'delivery_failed': AlertTriangle,
      'cancelled': X,
    };
    return iconMap[status] ?? Package;
  };

  const StatusIcon = getStatusIcon();

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
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
              Order #{orderNumber}
              {isCOD && <Badge className="bg-orange-500">COD</Badge>}
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
                    <span className="text-sm text-muted-foreground">Order ID:</span>
                    <span className="font-medium">{orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Created:</span>
                    <span className="font-medium">{format(new Date(createdAt), 'PPp')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Amount:</span>
                    <span className="font-bold text-lg">TZS {totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Payment Method:</span>
                    <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      {isCOD ? 'Cash on Delivery' : (order.payment_method || order.paymentMethod || 'N/A').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Payment Status:</span>
                    <Badge className={
                      (order.payment_status || order.paymentStatus) === 'paid' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }>
                      {(order.payment_status || order.paymentStatus || 'pending').toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Delivery Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Delivery Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Address:</span>
                    <p className="font-medium">{order.delivery_address || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Phone:</span>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {order.delivery_phone || 'Not provided'}
                    </p>
                  </div>
                  {order.customer && (
                    <div>
                      <span className="text-sm text-muted-foreground">Customer:</span>
                      <p className="font-medium flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {order.customer.name || 'Unknown'}
                      </p>
                    </div>
                  )}
                  {order.rider && (
                    <div className="bg-indigo-50 dark:bg-indigo-950/50 p-3 rounded-lg">
                      <span className="text-sm text-muted-foreground">Assigned Rider:</span>
                      <p className="font-medium flex items-center gap-1">
                        <Truck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        {order.rider.name} - {order.rider.phone}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Items ({items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{item.name || item.product_name}</p>
                          {item.sku && <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">Qty: {item.quantity}</p>
                          <p className="text-sm text-muted-foreground">
                            TZS {((item.price || item.sell_price || 0) * item.quantity).toLocaleString()}
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
                      <span className="text-sm text-muted-foreground">{getStatusProgress()}%</span>
                    </div>
                    <Progress value={getStatusProgress()} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Current Status:</span>
                    <Badge className={deliveryService.getStatusColor(status)}>
                      {deliveryService.getStatusLabel(status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* COD Actions */}
              {isCOD && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      COD Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {status === COD_ORDER_STATUSES.PENDING_PHARMACY_CONFIRMATION && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          This order requires your confirmation. Review the items and accept or reject.
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleAccept}
                            disabled={acceptOrder.isPending}
                            className="flex-1"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept Order
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={() => setRejectDialogOpen(true)}
                            disabled={rejectOrder.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}

                    {status === COD_ORDER_STATUSES.PREPARING_ORDER && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Prepare the order items. When ready, mark as ready for pickup.
                        </p>
                        <Button 
                          onClick={handleMarkReady}
                          disabled={markReady.isPending}
                          className="w-full"
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Mark as Ready for Pickup
                        </Button>
                      </div>
                    )}

                    {status === COD_ORDER_STATUSES.AWAITING_RIDER && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Order is ready! Assign a rider for delivery.
                        </p>
                        <Button 
                          onClick={() => setRiderDialogOpen(true)}
                          disabled={requestRider.isPending}
                          className="w-full"
                        >
                          <Truck className="h-4 w-4 mr-1" />
                          Assign Rider
                        </Button>
                      </div>
                    )}

                    {(status === COD_ORDER_STATUSES.RIDER_ASSIGNED || status === COD_ORDER_STATUSES.OUT_FOR_DELIVERY) && (
                      <div className="space-y-3 text-center">
                        <div className="animate-pulse flex items-center justify-center gap-2">
                          <Truck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                          <span className="text-muted-foreground">Rider is handling delivery...</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          The rider will update the status once delivered and cash is collected.
                        </p>
                      </div>
                    )}

                    {status === COD_ORDER_STATUSES.DELIVERED_AND_PAID && (
                      <div className="text-center space-y-2">
                        <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                        <p className="font-medium text-green-600">Order Completed!</p>
                        <p className="text-sm text-muted-foreground">
                          Cash has been collected and order is finalized.
                        </p>
                      </div>
                    )}

                    {status === COD_ORDER_STATUSES.DELIVERY_FAILED && (
                      <div className="text-center space-y-2">
                        <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
                        <p className="font-medium text-red-600">Delivery Failed</p>
                        <p className="text-sm text-muted-foreground">
                          Stock has been released back to inventory.
                        </p>
                      </div>
                    )}

                    {status === COD_ORDER_STATUSES.CANCELLED && (
                      <div className="text-center space-y-2">
                        <X className="h-12 w-12 text-gray-400 mx-auto" />
                        <p className="font-medium text-gray-500">Order Cancelled</p>
                      </div>
                    )}
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
                    {order.delivery_phone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${order.delivery_phone}`}>
                          <Phone className="h-4 w-4 mr-1" />
                          Call Customer
                        </a>
                      </Button>
                    )}
                    {order.delivery_address && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setMapDialogOpen(true)}
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        View on Map
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this order. The customer will be notified.
            </p>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectReason || rejectOrder.isPending}
            >
              Reject Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rider Assignment Dialog */}
      <Dialog open={riderDialogOpen} onOpenChange={setRiderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Delivery Rider</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a rider to deliver this order. They will be notified immediately.
            </p>
            <Select value={selectedRider} onValueChange={setSelectedRider}>
              <SelectTrigger>
                <SelectValue placeholder="Select a rider" />
              </SelectTrigger>
              <SelectContent>
                {riders.length === 0 ? (
                  <SelectItem value="none" disabled>No riders available</SelectItem>
                ) : (
                  riders.map((rider: any) => (
                    <SelectItem key={rider.id} value={rider.id}>
                      {rider.name} - {rider.phone}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRiderDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAssignRider}
              disabled={!selectedRider || requestRider.isPending}
            >
              <Truck className="h-4 w-4 mr-1" />
              Assign Rider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Map Dialog */}
      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Delivery Location</DialogTitle>
          </DialogHeader>
          <div className="h-[400px]">
            <DeliveryTrackingMap 
              orderId={order.id}
              riderId={order.rider?.id || ''}
              deliveryAddress={order.delivery_address}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 inline mr-1" />
            {order.delivery_address}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CODOrderManager;
