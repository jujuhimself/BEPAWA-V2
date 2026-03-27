import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Shield, MapPin, Phone, Pill, MessageCircle, Heart, Truck, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import PageHeader from '@/components/PageHeader';
import { useAvailablePrepPepServices, useCreatePrepPepBooking, useMyPrepPepBookings } from '@/hooks/usePrepPep';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import LocationPicker, { LocationData } from '@/components/delivery/LocationPicker';
import { calculateDeliveryFee, calculateDistance, formatTZS, MAX_DELIVERY_DISTANCE_KM, DELIVERY_PRICE_TIERS } from '@/utils/deliveryPricing';

const DEFAULT_FACILITY_LOCATION = { latitude: -6.1630, longitude: 35.7516 };

const PrepPepServices = () => {
  const { user } = useAuth();
  const { data: services = [], isLoading } = useAvailablePrepPepServices();
  const { data: myBookings = [] } = useMyPrepPepBookings();
  const createBooking = useCreatePrepPepBooking();

  const [bookingDialog, setBookingDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState({
    patient_name: '',
    patient_phone: '',
    patient_age: '',
    patient_gender: '',
    booking_date: format(new Date(), 'yyyy-MM-dd'),
    booking_time: '',
    special_instructions: '',
  });

  // COD delivery state
  const [deliveryLocation, setDeliveryLocation] = useState<LocationData | null>(null);
  const [deliveryDistance, setDeliveryDistance] = useState(0);

  const openBooking = (service: any) => {
    setSelectedService(service);
    setBookingForm(f => ({ ...f, patient_name: user?.name || '' }));
    setDeliveryLocation(null);
    setDeliveryDistance(0);
    setBookingDialog(true);
  };

  const facilityLocation = selectedService?.lab
    ? { latitude: selectedService.lab.latitude || DEFAULT_FACILITY_LOCATION.latitude, longitude: selectedService.lab.longitude || DEFAULT_FACILITY_LOCATION.longitude }
    : DEFAULT_FACILITY_LOCATION;

  const deliveryFee = deliveryLocation ? calculateDeliveryFee(deliveryDistance) : 0;

  const handleBook = () => {
    if (!selectedService || !bookingForm.patient_name || !bookingForm.patient_phone || !deliveryLocation) return;
    createBooking.mutate({
      lab_id: selectedService.lab_id,
      service_type: selectedService.service_type,
      total_amount: selectedService.price + deliveryFee,
      booking_date: bookingForm.booking_date,
      booking_time: bookingForm.booking_time || undefined,
      patient_name: bookingForm.patient_name,
      patient_phone: bookingForm.patient_phone || undefined,
      patient_age: bookingForm.patient_age ? Number(bookingForm.patient_age) : undefined,
      patient_gender: bookingForm.patient_gender || undefined,
      special_instructions: `Delivery: ${deliveryLocation.address}. Coords: ${deliveryLocation.latitude},${deliveryLocation.longitude}. ${bookingForm.special_instructions || ''}`.trim(),
      payment_method: 'cod',
    }, {
      onSuccess: () => {
        setBookingDialog(false);
        setDeliveryLocation(null);
        setDeliveryDistance(0);
      },
    });
  };

  // Group services by lab
  const labMap = new Map<string, { lab: any; services: any[] }>();
  services.forEach((s: any) => {
    const key = s.lab_id;
    if (!labMap.has(key)) labMap.set(key, { lab: s.lab, services: [] });
    labMap.get(key)!.services.push(s);
  });

  const getServiceLabel = (type?: string) => {
    if (!type) return 'Service';
    switch (type) {
      case 'prep': return 'PrEP';
      case 'pep': return 'PEP';
      case 'hiv_self_test': return 'HIV Self-Test Kit';
      case 'circumcision': return 'Circumcision';
      default: return type.toUpperCase();
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[status] || ''}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-background dark:via-background dark:to-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <PageHeader
          title="PrEP & PEP Services"
          description="Access HIV prevention services — confidential, stigma-free, and available near you. Pay Cash on Delivery."
          badge={{ text: "HIV Prevention", variant: "outline" }}
        />

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="p-5">
              <div className="flex gap-3">
                <Shield className="h-8 w-8 text-emerald-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg">PrEP (Pre-Exposure Prophylaxis)</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    A daily medicine taken <strong>before</strong> potential HIV exposure to prevent infection.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-5">
              <div className="flex gap-3">
                <Pill className="h-8 w-8 text-blue-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg">PEP (Post-Exposure Prophylaxis)</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Emergency medicine taken <strong>within 72 hours after</strong> potential HIV exposure.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Consultation CTA */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-emerald-500/5">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <MessageCircle className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold">Not sure which service you need?</h3>
              <p className="text-sm text-muted-foreground">Our AI assistant can help assess your situation confidentially.</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/bepawa-care">Talk to AI Assistant</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Available Services */}
        <div>
          <h2 className="text-xl font-bold mb-4">Available Facilities</h2>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading services...</div>
          ) : labMap.size === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No PrEP/PEP services available yet. Check back soon.</CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(labMap.entries()).map(([labId, { lab, services: labServices }]) => (
                <Card key={labId} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{lab?.business_name || lab?.name || 'Health Facility'}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {lab?.address || `${lab?.city || ''}, ${lab?.region || ''}`.trim() || 'Location not set'}
                    </CardDescription>
                    {lab?.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {lab.phone}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {labServices.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getServiceLabel(s.service_type)}</span>
                            <Badge variant="outline" className="text-xs text-emerald-600">
                              {s.stock_status === 'available' ? 'In Stock' : 'Out of Stock'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            TZS {s.price.toLocaleString()} • COD
                            {s.consultation_required && ' • Consultation required'}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => openBooking(s)} disabled={s.stock_status !== 'available'}>
                          Book
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* My Bookings */}
        {myBookings.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">My Bookings</h2>
            <div className="space-y-3">
              {myBookings.map((b) => (
                <Card key={b.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{getServiceLabel(b.service_type)}</span>
                        {getStatusBadge(b.status)}
                        <Badge variant="outline">{b.payment_status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(b.booking_date), 'PPP')} • {(b.lab as any)?.business_name || (b.lab as any)?.name || 'Facility'}
                      </div>
                      <div className="text-sm font-medium">TZS {b.total_amount.toLocaleString()} — Cash on Delivery</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Booking Dialog with COD */}
      <Dialog open={bookingDialog} onOpenChange={setBookingDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Book {getServiceLabel(selectedService?.service_type)} — Cash on Delivery
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Pay cash when your order is delivered by our Boda rider
              </p>
            </div>

            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={bookingForm.patient_name} onChange={(e) => setBookingForm(f => ({ ...f, patient_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone *</Label>
                <Input value={bookingForm.patient_phone} onChange={(e) => setBookingForm(f => ({ ...f, patient_phone: e.target.value }))} placeholder="+255 7XX XXX XXX" required />
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" value={bookingForm.patient_age} onChange={(e) => setBookingForm(f => ({ ...f, patient_age: e.target.value }))} />
              </div>
            </div>

            {/* Delivery Location with Map */}
            <div>
              <Label className="flex items-center gap-1 mb-2">
                <MapPin className="h-4 w-4" /> Delivery Location *
              </Label>
              <LocationPicker
                onLocationSelect={(location) => {
                  setDeliveryLocation(location);
                  const distance = calculateDistance(
                    facilityLocation.latitude, facilityLocation.longitude,
                    location.latitude, location.longitude
                  );
                  setDeliveryDistance(distance);
                }}
                pharmacyLocation={facilityLocation}
                placeholder="Search for your delivery location..."
              />
              {deliveryLocation && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{deliveryDistance.toFixed(1)} km</Badge>
                      <span className="text-sm text-muted-foreground">from facility</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{formatTZS(deliveryFee)}</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-xs text-muted-foreground flex items-center gap-1">
                              <Info className="h-3 w-3" /> Delivery fee
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-medium mb-1">Delivery Pricing</p>
                            <ul className="text-xs space-y-0.5">
                              {DELIVERY_PRICE_TIERS.map((tier, i) => (
                                <li key={i}>{tier.minKm}-{tier.maxKm} km: {formatTZS(tier.price)}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  {deliveryDistance > MAX_DELIVERY_DISTANCE_KM && (
                    <p className="text-xs text-amber-600 mt-2">⚠️ Beyond standard delivery range ({MAX_DELIVERY_DISTANCE_KM} km)</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={bookingForm.booking_date} onChange={(e) => setBookingForm(f => ({ ...f, booking_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Preferred Time</Label>
                <Input type="time" value={bookingForm.booking_time} onChange={(e) => setBookingForm(f => ({ ...f, booking_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Delivery Notes (optional)</Label>
              <Textarea value={bookingForm.special_instructions} onChange={(e) => setBookingForm(f => ({ ...f, special_instructions: e.target.value }))} placeholder="Any special instructions for the rider..." />
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
              <div className="flex justify-between"><span>Service:</span><span className="font-medium">{getServiceLabel(selectedService?.service_type)}</span></div>
              <div className="flex justify-between"><span>Service Fee:</span><span>TZS {selectedService?.price?.toLocaleString()}</span></div>
              {deliveryLocation && <div className="flex justify-between"><span>Delivery Fee:</span><span>{formatTZS(deliveryFee)}</span></div>}
              <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>TZS {((selectedService?.price || 0) + deliveryFee).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Payment:</span><span>Cash on Delivery</span></div>
              {selectedService?.consultation_required && (
                <div className="text-amber-600 flex items-center gap-1 mt-1">
                  <MessageCircle className="h-3.5 w-3.5" /> Consultation required — consider speaking to our AI assistant first.
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialog(false)}>Cancel</Button>
            <Button
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
              onClick={handleBook}
              disabled={createBooking.isPending || !bookingForm.patient_name || !bookingForm.patient_phone || !deliveryLocation}
            >
              <Truck className="h-4 w-4" />
              {createBooking.isPending ? 'Booking...' : 'Place COD Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrepPepServices;