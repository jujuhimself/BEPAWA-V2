import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  Check, 
  X, 
  Truck, 
  Clock, 
  MapPin, 
  Phone, 
  User,
  RefreshCw 
} from 'lucide-react';
import { 
  usePharmacyCODOrders, 
  useAcceptOrder, 
  useRejectOrder, 
  useMarkOrderReady,
  useRequestRider,
  useAvailableRiders 
} from '@/hooks/useDelivery';
import { deliveryService, COD_ORDER_STATUSES } from '@/services/deliveryService';
import { format } from 'date-fns';

const PharmacyCODOrders: React.FC = () => {
  const { data: orders = [], isLoading, refetch } = usePharmacyCODOrders();
  const { data: riders = [] } = useAvailableRiders();
  const acceptOrder = useAcceptOrder();
  const rejectOrder = useRejectOrder();
  const markReady = useMarkOrderReady();
  const requestRider = useRequestRider();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [riderDialogOpen, setRiderDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRider, setSelectedRider] = useState('');

  const handleAccept = (orderId: string) => {
    acceptOrder.mutate(orderId);
  };

  const handleReject = () => {
    if (selectedOrder && rejectReason) {
      rejectOrder.mutate({ orderId: selectedOrder.id, reason: rejectReason });
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedOrder(null);
    }
  };

  const handleMarkReady = (orderId: string) => {
    markReady.mutate(orderId);
  };

  const handleAssignRider = () => {
    if (selectedOrder && selectedRider) {
      requestRider.mutate({ orderId: selectedOrder.id, riderId: selectedRider });
      setRiderDialogOpen(false);
      setSelectedRider('');
      setSelectedOrder(null);
    }
  };

  const openRejectDialog = (order: any) => {
    setSelectedOrder(order);
    setRejectDialogOpen(true);
  };

  const openRiderDialog = (order: any) => {
    setSelectedOrder(order);
    setRiderDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading orders...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Cash on Delivery Orders
        </h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No pending COD orders</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order: any) => {
            const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
            const status = order.status;
            
            return (
              <Card key={order.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Order #{order.order_number}</CardTitle>
                    <Badge className={deliveryService.getStatusColor(status)}>
                      {deliveryService.getStatusLabel(status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {format(new Date(order.created_at), 'PPp')}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer Info */}
                  <div className="flex items-start gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{order.delivery_address || 'No address provided'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{order.delivery_phone || 'No phone'}</span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm font-medium mb-2">Items:</p>
                    <ul className="text-sm space-y-1">
                      {items.slice(0, 3).map((item: any, idx: number) => (
                        <li key={idx} className="flex justify-between">
                          <span>{item.name || item.product_name} x{item.quantity}</span>
                          <span>TZS {((item.price || item.sell_price) * item.quantity).toLocaleString()}</span>
                        </li>
                      ))}
                      {items.length > 3 && (
                        <li className="text-muted-foreground">+{items.length - 3} more items</li>
                      )}
                    </ul>
                    <div className="mt-2 pt-2 border-t flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>TZS {order.total_amount?.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Rider Info (if assigned) */}
                  {order.rider && (
                    <div className="flex items-center gap-2 text-sm bg-indigo-50 dark:bg-indigo-950/50 p-2 rounded">
                      <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Rider: {order.rider.name}</span>
                      <span className="text-muted-foreground">({order.rider.phone})</span>
                    </div>
                  )}

                  {/* Actions based on status */}
                  <div className="flex gap-2 flex-wrap">
                    {status === COD_ORDER_STATUSES.PENDING_PHARMACY_CONFIRMATION && (
                      <>
                        <Button 
                          onClick={() => handleAccept(order.id)}
                          disabled={acceptOrder.isPending}
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept Order
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={() => openRejectDialog(order)}
                          disabled={rejectOrder.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}

                    {status === COD_ORDER_STATUSES.PREPARING_ORDER && (
                      <Button 
                        onClick={() => handleMarkReady(order.id)}
                        disabled={markReady.isPending}
                        className="flex-1"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Mark as Ready
                      </Button>
                    )}

                    {status === COD_ORDER_STATUSES.AWAITING_RIDER && (
                      <Button 
                        onClick={() => openRiderDialog(order)}
                        disabled={requestRider.isPending}
                        className="flex-1"
                      >
                        <Truck className="h-4 w-4 mr-1" />
                        Assign Rider
                      </Button>
                    )}

                    {(status === COD_ORDER_STATUSES.RIDER_ASSIGNED || status === COD_ORDER_STATUSES.OUT_FOR_DELIVERY) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Waiting for rider update...</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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
    </div>
  );
};

export default PharmacyCODOrders;
