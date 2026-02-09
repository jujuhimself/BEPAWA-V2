import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Shield, MapPin, Phone, Pill, CheckCircle, MessageCircle, Calendar, Heart } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAvailablePrepPepServices, useCreatePrepPepBooking, useMyPrepPepBookings } from '@/hooks/usePrepPep';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

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

  const openBooking = (service: any) => {
    setSelectedService(service);
    setBookingForm(f => ({ ...f, patient_name: user?.name || '' }));
    setBookingDialog(true);
  };

  const handleBook = () => {
    if (!selectedService || !bookingForm.patient_name) return;
    createBooking.mutate({
      lab_id: selectedService.lab_id,
      service_type: selectedService.service_type,
      total_amount: selectedService.price,
      booking_date: bookingForm.booking_date,
      booking_time: bookingForm.booking_time || undefined,
      patient_name: bookingForm.patient_name,
      patient_phone: bookingForm.patient_phone || undefined,
      patient_age: bookingForm.patient_age ? Number(bookingForm.patient_age) : undefined,
      patient_gender: bookingForm.patient_gender || undefined,
      special_instructions: bookingForm.special_instructions || undefined,
      payment_method: 'cod',
    }, {
      onSuccess: () => setBookingDialog(false),
    });
  };

  // Group services by lab
  const labMap = new Map<string, { lab: any; services: any[] }>();
  services.forEach((s: any) => {
    const key = s.lab_id;
    if (!labMap.has(key)) labMap.set(key, { lab: s.lab, services: [] });
    labMap.get(key)!.services.push(s);
  });

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
          description="Access HIV prevention services — confidential, stigma-free, and available near you."
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
                    A daily medicine taken <strong>before</strong> potential HIV exposure to prevent infection. Highly effective when taken consistently.
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
                    Emergency medicine taken <strong>within 72 hours after</strong> potential HIV exposure. Must be started ASAP for effectiveness.
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
              <p className="text-sm text-muted-foreground">
                Our AI-powered assistant can help assess your situation, provide education, and guide you confidentially.
              </p>
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
                            <span className="font-medium">{s.service_type === 'prep' ? 'PrEP' : 'PEP'}</span>
                            <Badge variant="outline" className="text-xs text-emerald-600">
                              {s.stock_status === 'available' ? 'In Stock' : 'Out of Stock'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            TZS {s.price.toLocaleString()}
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
                        <span className="font-semibold">{b.service_type.toUpperCase()}</span>
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

      {/* Booking Dialog */}
      <Dialog open={bookingDialog} onOpenChange={setBookingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Book {selectedService?.service_type === 'prep' ? 'PrEP' : 'PEP'} Service
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={bookingForm.patient_name} onChange={(e) => setBookingForm(f => ({ ...f, patient_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={bookingForm.patient_phone} onChange={(e) => setBookingForm(f => ({ ...f, patient_phone: e.target.value }))} placeholder="+255..." />
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" value={bookingForm.patient_age} onChange={(e) => setBookingForm(f => ({ ...f, patient_age: e.target.value }))} />
              </div>
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
              <Label>Special Instructions</Label>
              <Textarea value={bookingForm.special_instructions} onChange={(e) => setBookingForm(f => ({ ...f, special_instructions: e.target.value }))} placeholder="Any additional notes..." />
            </div>
            <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
              <div className="flex justify-between"><span>Service:</span><span className="font-medium">{selectedService?.service_type?.toUpperCase()}</span></div>
              <div className="flex justify-between"><span>Amount:</span><span className="font-bold">TZS {selectedService?.price?.toLocaleString()}</span></div>
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
            <Button onClick={handleBook} disabled={createBooking.isPending || !bookingForm.patient_name}>
              {createBooking.isPending ? 'Booking...' : 'Confirm Booking (COD)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrepPepServices;
