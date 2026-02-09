import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Pill, Clock, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { useMyPrepPepServices, useUpsertPrepPepService, useLabPrepPepBookings, useUpdatePrepPepBookingStatus } from '@/hooks/usePrepPep';
import { format } from 'date-fns';

const PrepPepManagement = () => {
  const { data: services = [], isLoading } = useMyPrepPepServices();
  const { data: bookings = [], isLoading: bookingsLoading } = useLabPrepPepBookings();
  const upsertService = useUpsertPrepPepService();
  const updateStatus = useUpdatePrepPepBookingStatus();

  const prepService = services.find(s => s.service_type === 'prep');
  const pepService = services.find(s => s.service_type === 'pep');

  const [prepForm, setPrepForm] = useState({
    is_available: prepService?.is_available ?? false,
    consultation_required: prepService?.consultation_required ?? true,
    stock_status: prepService?.stock_status ?? 'available',
    price: prepService?.price ?? 0,
    description: prepService?.description ?? '',
  });

  const [pepForm, setPepForm] = useState({
    is_available: pepService?.is_available ?? false,
    consultation_required: pepService?.consultation_required ?? true,
    stock_status: pepService?.stock_status ?? 'available',
    price: pepService?.price ?? 0,
    description: pepService?.description ?? '',
  });

  // Sync forms when data loads
  if (prepService && !prepForm.description && prepService.description) {
    setPrepForm({
      is_available: prepService.is_available,
      consultation_required: prepService.consultation_required,
      stock_status: prepService.stock_status,
      price: prepService.price,
      description: prepService.description || '',
    });
  }
  if (pepService && !pepForm.description && pepService.description) {
    setPepForm({
      is_available: pepService.is_available,
      consultation_required: pepService.consultation_required,
      stock_status: pepService.stock_status,
      price: pepService.price,
      description: pepService.description || '',
    });
  }

  const handleSave = (type: 'prep' | 'pep') => {
    const form = type === 'prep' ? prepForm : pepForm;
    upsertService.mutate({ service_type: type, ...form });
  };

  const ServiceForm = ({ type, form, setForm }: { type: 'prep' | 'pep'; form: typeof prepForm; setForm: React.Dispatch<React.SetStateAction<typeof prepForm>> }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {type === 'prep' ? 'PrEP (Pre-Exposure Prophylaxis)' : 'PEP (Post-Exposure Prophylaxis)'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Service Available</Label>
          <Switch checked={form.is_available} onCheckedChange={(v) => setForm(f => ({ ...f, is_available: v }))} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Consultation Required</Label>
          <Switch checked={form.consultation_required} onCheckedChange={(v) => setForm(f => ({ ...f, consultation_required: v }))} />
        </div>
        <div className="space-y-2">
          <Label>Stock Status</Label>
          <Select value={form.stock_status} onValueChange={(v) => setForm(f => ({ ...f, stock_status: v as any }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Price (TZS)</Label>
          <Input type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the service, requirements, etc." />
        </div>
        <Button onClick={() => handleSave(type)} disabled={upsertService.isPending} className="w-full">
          Save {type.toUpperCase()} Settings
        </Button>
      </CardContent>
    </Card>
  );

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      scheduled: 'bg-indigo-100 text-indigo-800',
      in_progress: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return <Badge className={colors[status] || ''}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <Tabs defaultValue="services" className="space-y-4">
      <TabsList>
        <TabsTrigger value="services">Service Settings</TabsTrigger>
        <TabsTrigger value="bookings">
          Bookings
          {bookings.filter(b => b.status === 'pending').length > 0 && (
            <Badge variant="destructive" className="ml-2 text-xs">{bookings.filter(b => b.status === 'pending').length}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="services">
        <div className="grid md:grid-cols-2 gap-6">
          <ServiceForm type="prep" form={prepForm} setForm={setPrepForm} />
          <ServiceForm type="pep" form={pepForm} setForm={setPepForm} />
        </div>
      </TabsContent>

      <TabsContent value="bookings">
        {bookingsLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No bookings yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{booking.patient_name}</span>
                        {getStatusBadge(booking.status)}
                        <Badge variant="outline">{booking.service_type.toUpperCase()}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(booking.booking_date), 'PPP')} {booking.booking_time && `at ${booking.booking_time}`}
                        {booking.patient_phone && ` • ${booking.patient_phone}`}
                      </div>
                      <div className="text-sm font-medium">TZS {booking.total_amount.toLocaleString()} • {booking.payment_status}</div>
                      {booking.special_instructions && <p className="text-sm text-muted-foreground">{booking.special_instructions}</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {booking.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => updateStatus.mutate({ id: booking.id, status: 'confirmed' })}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Confirm
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: booking.id, status: 'cancelled' })}>
                            Cancel
                          </Button>
                        </>
                      )}
                      {booking.status === 'confirmed' && (
                        <Button size="sm" onClick={() => updateStatus.mutate({ id: booking.id, status: 'in_progress' })}>
                          Start Service
                        </Button>
                      )}
                      {booking.status === 'in_progress' && (
                        <Button size="sm" onClick={() => updateStatus.mutate({ id: booking.id, status: 'completed', paymentStatus: 'paid' })}>
                          <Package className="h-4 w-4 mr-1" /> Complete & Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default PrepPepManagement;
