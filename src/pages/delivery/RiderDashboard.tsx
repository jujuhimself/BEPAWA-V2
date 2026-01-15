import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, 
  MapPin, 
  Phone, 
  Navigation, 
  Check, 
  X, 
  Truck,
  DollarSign,
  RefreshCw,
  Store,
  Clock,
  AlertCircle,
  Locate
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useRiderAssignments,
  useAcceptDelivery,
  useMarkPickedUp,
  useMarkDeliveredAndPaid,
  useMarkDeliveryFailed
} from '@/hooks/useDelivery';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import DeliveryTrackingMap from '@/components/delivery/DeliveryTrackingMap';

const RiderDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: assignments = [], isLoading, refetch } = useRiderAssignments();
  const acceptDelivery = useAcceptDelivery();
  const markPickedUp = useMarkPickedUp();
  const markDelivered = useMarkDeliveredAndPaid();
  const markFailed = useMarkDeliveryFailed();

  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [failDialogOpen, setFailDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [failReason, setFailReason] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const watchIdRef = React.useRef<number | null>(null);

  // Auto-start location tracking when rider picks up an order
  useEffect(() => {
    const activeDelivery = assignments.find((a: any) => a.status === 'picked_up');
    if (activeDelivery && !isTracking) {
      setCurrentOrderId(activeDelivery.order_id);
      startLocationTracking(activeDelivery.order_id);
    } else if (!activeDelivery && isTracking) {
      stopLocationTracking();
    }
  }, [assignments]);

  const startLocationTracking = (orderId: string) => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    setIsTracking(true);
    setCurrentOrderId(orderId);
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString()
        };

        // Broadcast location to subscribers
        await supabase.channel(`rider-location-${orderId}`).send({
          type: 'broadcast',
          event: 'location_update',
          payload: location
        });
      },
      (err) => {
        console.error('Geolocation error:', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  };

  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setCurrentOrderId(null);
  };

  const handleAccept = (assignmentId: string) => {
    acceptDelivery.mutate(assignmentId);
  };

  const handlePickedUp = (assignmentId: string, orderId: string) => {
    markPickedUp.mutate(assignmentId);
    startLocationTracking(orderId);
  };

  const openCashDialog = (assignment: any) => {
    setSelectedAssignment(assignment);
    setCashAmount(assignment.cash_amount?.toString() || '');
    setCashDialogOpen(true);
  };

  const handleDelivered = () => {
    if (selectedAssignment && cashAmount) {
      markDelivered.mutate({ 
        assignmentId: selectedAssignment.id, 
        cashAmount: parseFloat(cashAmount) 
      });
      stopLocationTracking();
      setCashDialogOpen(false);
      setCashAmount('');
      setSelectedAssignment(null);
    }
  };

  const openFailDialog = (assignment: any) => {
    setSelectedAssignment(assignment);
    setFailDialogOpen(true);
  };

  const handleFailed = () => {
    if (selectedAssignment && failReason) {
      markFailed.mutate({ 
        assignmentId: selectedAssignment.id, 
        reason: failReason 
      });
      stopLocationTracking();
      setFailDialogOpen(false);
      setFailReason('');
      setSelectedAssignment(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      assigned: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-orange-100 text-orange-800',
    };
    const labels: Record<string, string> = {
      assigned: 'New Assignment',
      accepted: 'Ready for Pickup',
      picked_up: 'Out for Delivery',
    };
    return (
      <Badge className={styles[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Loading deliveries...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            My Deliveries
          </h1>
          <p className="text-muted-foreground">Welcome, {user?.name || 'Rider'}</p>
        </div>
        <div className="flex items-center gap-2">
          {isTracking && (
            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
              <Locate className="h-3 w-3 animate-pulse" />
              Sharing Location
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">
              {assignments.filter((a: any) => a.status === 'assigned').length}
            </p>
            <p className="text-xs text-yellow-600">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">
              {assignments.filter((a: any) => a.status === 'accepted').length}
            </p>
            <p className="text-xs text-blue-600">To Pickup</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-700">
              {assignments.filter((a: any) => a.status === 'picked_up').length}
            </p>
            <p className="text-xs text-orange-600">Delivering</p>
          </CardContent>
        </Card>
      </div>

      {/* Assignments */}
      {assignments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No active deliveries</p>
            <p className="text-sm text-muted-foreground mt-1">
              New assignments will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment: any) => (
            <Card key={assignment.id} className="overflow-hidden">
              <CardHeader className="pb-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Order #{assignment.order?.order_number}
                  </CardTitle>
                  {getStatusBadge(assignment.status)}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(assignment.created_at), 'PPp')}
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Pharmacy Info */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium flex items-center gap-1 mb-1">
                    <Store className="h-4 w-4 text-blue-600" />
                    Pickup Location
                  </p>
                  <p className="text-sm">{assignment.pharmacy?.pharmacy_name}</p>
                  <p className="text-sm text-muted-foreground">{assignment.pickup_address}</p>
                  {assignment.pharmacy?.phone && (
                    <a 
                      href={`tel:${assignment.pharmacy.phone}`}
                      className="text-sm text-blue-600 flex items-center gap-1 mt-1"
                    >
                      <Phone className="h-3 w-3" />
                      {assignment.pharmacy.phone}
                    </a>
                  )}
                </div>

                {/* Customer Info */}
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm font-medium flex items-center gap-1 mb-1">
                    <MapPin className="h-4 w-4 text-green-600" />
                    Delivery Location
                  </p>
                  <p className="text-sm">{assignment.delivery_address}</p>
                  {assignment.customer_phone && (
                    <a 
                      href={`tel:${assignment.customer_phone}`}
                      className="text-sm text-green-600 flex items-center gap-1 mt-1"
                    >
                      <Phone className="h-3 w-3" />
                      {assignment.customer_phone}
                    </a>
                  )}
                </div>

                {/* Live Map for picked up orders */}
                {assignment.status === 'picked_up' && (
                  <DeliveryTrackingMap
                    orderId={assignment.order_id}
                    riderId={user?.id || ''}
                    deliveryAddress={assignment.delivery_address}
                    pickupAddress={assignment.pickup_address}
                    showRiderControls={true}
                  />
                )}

                {/* Cash to Collect */}
                <div className="bg-yellow-50 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-yellow-600" />
                      Cash to Collect
                    </p>
                  </div>
                  <p className="text-xl font-bold text-yellow-700">
                    TZS {assignment.cash_amount?.toLocaleString()}
                  </p>
                </div>

                {/* Actions based on status */}
                <div className="flex gap-2">
                  {assignment.status === 'assigned' && (
                    <Button 
                      className="flex-1"
                      onClick={() => handleAccept(assignment.id)}
                      disabled={acceptDelivery.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept Delivery
                    </Button>
                  )}

                  {assignment.status === 'accepted' && (
                    <>
                      <Button 
                        className="flex-1"
                        onClick={() => handlePickedUp(assignment.id, assignment.order_id)}
                        disabled={markPickedUp.isPending}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Mark Picked Up
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(assignment.pickup_address)}`, '_blank')}
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {assignment.status === 'picked_up' && (
                    <>
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => openCashDialog(assignment)}
                        disabled={markDelivered.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Delivered & Paid
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => openFailDialog(assignment)}
                        disabled={markFailed.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(assignment.delivery_address)}`, '_blank')}
                      >
                        <Navigation className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cash Collected Dialog */}
      <Dialog open={cashDialogOpen} onOpenChange={setCashDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Confirm Cash Collection
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the exact amount of cash collected from the customer.
            </p>
            <div>
              <label className="text-sm font-medium">Cash Amount (TZS)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700">
                Make sure you have collected the full payment before confirming.
                This will finalize the order.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleDelivered}
              disabled={!cashAmount || markDelivered.isPending}
            >
              Confirm Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Failure Dialog */}
      <Dialog open={failDialogOpen} onOpenChange={setFailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <X className="h-5 w-5" />
              Report Delivery Failure
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please explain why the delivery could not be completed.
            </p>
            <Textarea
              placeholder="Reason for failure (e.g., customer not available, wrong address, refused delivery)..."
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={handleFailed}
              disabled={!failReason || markFailed.isPending}
            >
              Report Failure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RiderDashboard;
