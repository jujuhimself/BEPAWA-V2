import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import LabResults from '@/components/individual/LabResults';
import { useCreateCODOrder } from '@/hooks/useDelivery';
import LocationPicker, { LocationData } from '@/components/delivery/LocationPicker';
import { calculateDeliveryFee, calculateDistance, formatTZS, MAX_DELIVERY_DISTANCE_KM, DELIVERY_PRICE_TIERS } from '@/utils/deliveryPricing';
import { MapPin, Phone, Truck, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { appointmentService } from '@/services/appointmentService';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DEFAULT_PHARMACY_LOCATION = { latitude: -6.1630, longitude: 35.7516 };

const swahiliGreetings = ["habari", "shikamoo", "mambo", "vipi", "salama"];

const PersonalHealth = () => {
  const [activeTab, setActiveTab] = useState<'hiv' | 'circumcision' | 'chatbot'>('hiv');
  const [hivPharmacies, setHivPharmacies] = useState<any[]>([]);
  const [loadingHiv, setLoadingHiv] = useState(false);
  const [circumcisionClinics, setCircumcisionClinics] = useState<any[]>([]);
  const [loadingCircumcision, setLoadingCircumcision] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [chatbotMode, setChatbotMode] = useState<'hiv' | 'circumcision' | null>(null);
  const [chatStep, setChatStep] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ from: 'bot' | 'user', text: string }[]>([]);
  const [prescreenAnswers, setPrescreenAnswers] = useState<any>({});
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [assistantView, setAssistantView] = useState<'quick' | 'order' | 'booking' | 'chat'>('quick');

  // COD order state
  const [orderName, setOrderName] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState<LocationData | null>(null);
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const createCODOrder = useCreateCODOrder();

  // Circumcision booking state
  const [bookingForm, setBookingForm] = useState({ name: '', age: '', phone: '', notes: '', loading: false, error: '', success: false });
  const [bookedSlots, setBookedSlots] = useState<{ date: string, time: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');

  const timeOptions = Array.from({ length: 21 }, (_, i) => {
    const hour = 8 + Math.floor(i / 2);
    const min = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${min}`;
  });

  useEffect(() => {
    if (activeTab === 'hiv') {
      setLoadingHiv(true);
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'retail')
        .eq('self_test_available', true)
        .then(({ data }) => {
          setHivPharmacies(data || []);
          setLoadingHiv(false);
        });
    }
    if (activeTab === 'circumcision') {
      setLoadingCircumcision(true);
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'lab')
        .eq('offers_circumcision', true)
        .then(({ data }) => {
          setCircumcisionClinics(data || []);
          setLoadingCircumcision(false);
        });
    }
  }, [activeTab]);

  useEffect(() => {
    if (chatbotOpen) {
      setTimeout(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    }
  }, [chatHistory, chatbotOpen]);

  useEffect(() => {
    if (assistantView === 'booking') {
      supabase
        .from('appointments')
        .select('appointment_date, appointment_time')
        .then(({ data }) => {
          setBookedSlots(data ? data.map((a: any) => ({ date: a.appointment_date, time: a.appointment_time })) : []);
        });
    }
  }, [assistantView]);

  const resetOrderForm = () => {
    setOrderName('');
    setDeliveryLocation(null);
    setDeliveryPhone('');
    setDeliveryNotes('');
    setDeliveryDistance(0);
  };

  const handleCODOrder = async () => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please log in to place an order.', variant: 'destructive' });
      navigate('/login');
      return;
    }
    if (!deliveryLocation || !deliveryPhone || !orderName) {
      toast({ title: 'Missing Information', description: 'Please fill in your name, delivery location and phone number.', variant: 'destructive' });
      return;
    }
    if (!selectedPharmacy?.id) {
      toast({ title: 'Error', description: 'No pharmacy selected.', variant: 'destructive' });
      return;
    }

    const deliveryFee = calculateDeliveryFee(deliveryDistance);

    createCODOrder.mutate({
      user_id: user.id,
      items: [{ product_name: 'HIV Self-Test Kit', quantity: 1, unit_price: 15000, total_price: 15000, pharmacy_id: selectedPharmacy.id, pharmacy_name: selectedPharmacy.name || selectedPharmacy.business_name }],
      total_amount: 15000 + deliveryFee,
      delivery_address: deliveryLocation.address,
      delivery_phone: deliveryPhone,
      delivery_notes: `Name/Alias: ${orderName}. ${deliveryNotes}`.trim(),
      pharmacy_id: selectedPharmacy.id,
      delivery_fee: deliveryFee,
      delivery_coordinates: {
        latitude: deliveryLocation.latitude,
        longitude: deliveryLocation.longitude,
      },
    }, {
      onSuccess: () => {
        resetOrderForm();
        setChatbotOpen(false);
        setAssistantView('quick');
        navigate('/my-orders');
      }
    });
  };

  // Chatbot logic handler
  const handleChatSubmit = () => {
    const input = chatInput.trim();
    if (!input) return;
    setChatHistory(h => [...h, { from: 'user', text: input }]);
    setChatInput('');
    if (swahiliGreetings.some(g => input.toLowerCase().includes(g))) {
      setChatHistory(h => [...h, { from: 'bot', text: 'Karibu! Naweza kujibu maswali yako kuhusu afya yako binafsi. Una swali gani leo?' }]);
      return;
    }
    if (chatbotMode === 'hiv') {
      if (chatStep === 0) { setChatHistory(h => [...h, { from: 'bot', text: 'Would you like to know more about how HIV self-testing works?' }]); setChatStep(1); return; }
      if (chatStep === 1) {
        if (/yes|yep|sure|ok|yeah/i.test(input)) {
          setChatHistory(h => [...h, { from: 'bot', text: 'HIV self-testing lets you check your HIV status privately, using a kit at home.' }, { from: 'bot', text: 'The tests are highly accurate when used correctly.' }, { from: 'bot', text: 'You can order a kit here and it will be delivered discreetly.' }, { from: 'bot', text: 'Would you like step-by-step instructions on how to use the test?' }]);
          setChatStep(2);
        } else { setChatHistory(h => [...h, { from: 'bot', text: 'No problem. If you have any questions or feel anxious, I am here to support you.' }]); }
        return;
      }
      if (chatStep === 2) {
        if (/yes|yep|sure|ok|yeah/i.test(input)) {
          setChatHistory(h => [...h, { from: 'bot', text: '1. Wash your hands and read the kit instructions.' }, { from: 'bot', text: '2. Collect a sample (usually saliva or a finger prick).' }, { from: 'bot', text: '3. Wait for the result as per the kit instructions.' }, { from: 'bot', text: '4. If positive, seek confirmatory testing at a clinic. If negative, continue regular testing as needed.' }, { from: 'bot', text: 'Remember, your status does not define you. We can talk through the next steps together — at your pace.' }]);
          setChatStep(3);
        } else { setChatHistory(h => [...h, { from: 'bot', text: 'Okay. If you want to talk through the process or have questions, I am here.' }]); }
        return;
      }
      if (/scared|worried|afraid|anxious|don\'t want to know|fear/i.test(input)) {
        setChatHistory(h => [...h, { from: 'bot', text: "You're not alone. Many people feel this way. When you're ready, I'm here to walk you through it." }]);
        return;
      }
      setChatHistory(h => [...h, { from: 'bot', text: 'Is there anything else you would like to know about HIV self-testing?' }]);
      return;
    }
    if (chatbotMode === 'circumcision') {
      if (chatStep === 0) { setChatHistory(h => [...h, { from: 'bot', text: 'Are you looking to book a circumcision appointment or learn more about it?' }]); setChatStep(1); return; }
      if (chatStep === 1) {
        if (/learn|info|information|about/i.test(input)) {
          setChatHistory(h => [...h, { from: 'bot', text: 'Circumcision is a minor surgical procedure to remove the foreskin from the penis.' }, { from: 'bot', text: 'It is recommended for health, hygiene, and sometimes religious or cultural reasons.' }, { from: 'bot', text: 'The procedure is quick, usually done under local anesthesia, and recovery takes about a week.' }, { from: 'bot', text: 'For individuals aged 15+, it is free and confidential at participating clinics.' }, { from: 'bot', text: 'Would you like to book an appointment or ask more questions?' }]);
          setChatStep(2);
        } else if (/book|appointment|schedule/i.test(input)) {
          setChatHistory(h => [...h, { from: 'bot', text: 'Great! May I ask your age?' }]); setChatStep(10);
        } else {
          setChatHistory(h => [...h, { from: 'bot', text: 'I can provide information or help you book. Please type "learn" or "book".' }]);
        }
        return;
      }
      if (chatStep === 2) {
        if (/book|appointment|schedule/i.test(input)) { setChatHistory(h => [...h, { from: 'bot', text: 'Great! May I ask your age?' }]); setChatStep(10); }
        else { setChatHistory(h => [...h, { from: 'bot', text: 'Feel free to ask any more questions about circumcision.' }]); }
        return;
      }
      if (chatStep === 10) { setPrescreenAnswers(a => ({ ...a, age: input })); if (parseInt(input) < 15) { setChatHistory(h => [...h, { from: 'bot', text: 'Circumcision is only available for individuals aged 15 and above.' }]); setChatStep(0); return; } setChatHistory(h => [...h, { from: 'bot', text: 'Have you ever been diagnosed with a bleeding disorder (e.g., hemophilia)?' }]); setChatStep(11); return; }
      if (chatStep === 11) { setPrescreenAnswers(a => ({ ...a, bleeding: input })); setChatHistory(h => [...h, { from: 'bot', text: 'Are you currently experiencing pain or inflammation in the genital area?' }]); setChatStep(12); return; }
      if (chatStep === 12) { setPrescreenAnswers(a => ({ ...a, pain: input })); setChatHistory(h => [...h, { from: 'bot', text: 'Have you been circumcised before?' }]); setChatStep(13); return; }
      if (chatStep === 13) { setPrescreenAnswers(a => ({ ...a, circumcised: input })); setChatHistory(h => [...h, { from: 'bot', text: 'Are you comfortable receiving a circumcision under local anesthesia?' }]); setChatStep(14); return; }
      if (chatStep === 14) {
        setPrescreenAnswers(a => ({ ...a, anesthesia: input }));
        const concerning = [prescreenAnswers.bleeding, prescreenAnswers.pain, input].some(ans => /yes|yep|true/i.test(ans));
        if (concerning) { setChatHistory(h => [...h, { from: 'bot', text: "Thanks for your honesty. You may need a personalized consultation. Would you like me to help you schedule one?" }]); setChatStep(0); }
        else { setChatHistory(h => [...h, { from: 'bot', text: "You're eligible. I can help you book an appointment at a nearby clinic now." }]); setChatStep(15); }
        return;
      }
      if (chatStep === 15) { setChatHistory(h => [...h, { from: 'bot', text: 'Would you like a summary of this conversation sent to your inbox, or do you prefer to keep it here for now?' }]); setChatStep(0); return; }
      setChatHistory(h => [...h, { from: 'bot', text: 'Would you like to learn more or book an appointment?' }]);
      return;
    }
  };

  const pharmacyLocation = selectedPharmacy
    ? { latitude: selectedPharmacy.latitude || DEFAULT_PHARMACY_LOCATION.latitude, longitude: selectedPharmacy.longitude || DEFAULT_PHARMACY_LOCATION.longitude }
    : DEFAULT_PHARMACY_LOCATION;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-blue-50 py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <Badge variant="secondary" className="mb-4 bg-pink-100 text-pink-700 border-pink-200 text-lg">Personal Health</Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Health, Your Privacy</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Access sensitive healthcare services — like HIV self-testing and circumcision — privately, safely, and with dignity. No judgment, no stigma.
          </p>
        </div>
        <div className="flex justify-center gap-4 mb-8">
          <Button variant={activeTab === 'hiv' ? 'default' : 'outline'} onClick={() => setActiveTab('hiv')}>🧪 HIV Self-Test Kits</Button>
          <Button variant={activeTab === 'circumcision' ? 'default' : 'outline'} onClick={() => setActiveTab('circumcision')}>✂️ Circumcision</Button>
          <Button variant={activeTab === 'chatbot' ? 'default' : 'outline'} onClick={() => setActiveTab('chatbot')}>🤖 Health Assistant</Button>
        </div>

        {/* HIV Self-Test Kits Section */}
        {activeTab === 'hiv' && (
          <section id="hiv" className="mb-10">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Order HIV Self-Test Kits Privately</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-muted-foreground">Browse and order HIV self-test kits from trusted pharmacies. Your order is private and discreet — delivered by our Boda rider with Cash on Delivery.</p>
                {loadingHiv ? (
                  <div className="text-center text-muted-foreground py-8">Loading pharmacies...</div>
                ) : hivPharmacies.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No pharmacies found offering HIV self-test kits.</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {hivPharmacies.map(pharmacy => (
                      <Card key={pharmacy.id} className="border shadow-md">
                        <CardHeader>
                          <CardTitle className="text-lg">{pharmacy.business_name || pharmacy.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-muted-foreground mb-2">{pharmacy.address}</div>
                          <div className="text-sm text-muted-foreground mb-2">{pharmacy.phone}</div>
                          <Button
                            className="w-full mt-2"
                            onClick={() => {
                              setSelectedPharmacy(pharmacy);
                              setOrderName(user?.name || '');
                              setChatbotOpen(true);
                              setAssistantView('order');
                            }}
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            Order Discreetly (COD)
                          </Button>
                          <div className="text-xs text-muted-foreground mt-2">Pay cash when delivered by our Boda rider</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Circumcision Booking Section */}
        {activeTab === 'circumcision' && (
          <section id="circumcision" className="mb-10">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Book Circumcision Appointment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-muted-foreground">Book a confidential circumcision appointment at a trusted clinic. Free for individuals aged 15+.</p>
                {loadingCircumcision ? (
                  <div className="text-center text-muted-foreground py-8">Loading clinics...</div>
                ) : circumcisionClinics.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No clinics found offering circumcision.</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {circumcisionClinics.map(clinic => (
                      <Card key={clinic.id} className="border shadow-md">
                        <CardHeader>
                          <CardTitle className="text-lg">{clinic.business_name || clinic.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-muted-foreground mb-2">{clinic.address}</div>
                          <div className="text-sm text-muted-foreground mb-2">{clinic.phone}</div>
                          <Button
                            className="w-full mt-2"
                            onClick={() => {
                              setSelectedClinic(clinic);
                              setChatbotOpen(true);
                              setAssistantView('booking');
                              setBookingForm(f => ({ ...f, name: user?.name || '' }));
                            }}
                          >
                            Start Booking
                          </Button>
                          <div className="text-xs text-muted-foreground mt-2">Prescreening required for privacy and safety</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Chatbot Section */}
        {activeTab === 'chatbot' && (
          <section id="chatbot" className="mb-10">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>About Personal Health Assistant</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-muted-foreground">
                  The Personal Health Assistant is here to provide you with confidential support, guidance, and answers to your questions about HIV self-testing and circumcision. Use the tabs above to access services.
                </p>
                <ul className="list-disc pl-6 text-muted-foreground">
                  <li>🧪 Order HIV self-test kits privately and discreetly.</li>
                  <li>✂️ Book a confidential circumcision appointment (free for 15+).</li>
                  <li>🤖 Chatbot support is available when you start an order or booking.</li>
                </ul>
              </CardContent>
            </Card>
          </section>
        )}
        <LabResults />
      </div>

      {/* Health Assistant Dialog */}
      <Dialog open={chatbotOpen} onOpenChange={setChatbotOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Health Assistant</DialogTitle>
          </DialogHeader>

          {assistantView === 'quick' && (
            <div className="flex flex-col gap-4 py-4">
              <Button className="w-full" onClick={() => setAssistantView('order')}>Order HIV Self-Test Kit (COD)</Button>
              <Button className="w-full" variant="secondary" onClick={() => setAssistantView('booking')}>Book Circumcision Appointment</Button>
              <Button className="w-full" variant="outline" onClick={() => { setAssistantView('chat'); setChatbotMode('hiv'); setChatStep(0); setChatHistory([{ from: 'bot', text: "I'm here to support you. Would you like to know more about how HIV self-testing works?" }]); }}>FAQs / Ask a Question</Button>
            </div>
          )}

          {/* ===== COD ORDER FORM (HIV Self-Test Kit) ===== */}
          {assistantView === 'order' && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setAssistantView('quick')}>← Back to Quick Actions</Button>

              <p className="text-sm">Ordering from: <b>{selectedPharmacy?.business_name || selectedPharmacy?.name || 'Select a pharmacy from the main page'}</b></p>

              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Pay cash when your order is delivered by our Boda rider
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Name (or alias):</Label>
                  <Input value={orderName} onChange={e => setOrderName(e.target.value)} placeholder="Your name or alias" required />
                  <p className="text-xs text-muted-foreground mt-1">You may use an alias for privacy.</p>
                </div>

                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    <MapPin className="h-4 w-4" />
                    Delivery Location
                  </Label>
                  <LocationPicker
                    onLocationSelect={(location) => {
                      setDeliveryLocation(location);
                      const distance = calculateDistance(
                        pharmacyLocation.latitude, pharmacyLocation.longitude,
                        location.latitude, location.longitude
                      );
                      setDeliveryDistance(distance);
                    }}
                    pharmacyLocation={pharmacyLocation}
                    placeholder="Search for your delivery location..."
                  />
                  {deliveryLocation && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{deliveryDistance.toFixed(1)} km</Badge>
                          <span className="text-sm text-muted-foreground">from pharmacy</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">{formatTZS(calculateDeliveryFee(deliveryDistance))}</p>
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

                <div>
                  <Label className="flex items-center gap-1">
                    <Phone className="h-4 w-4" /> Phone Number
                  </Label>
                  <Input type="tel" placeholder="+255 7XX XXX XXX" value={deliveryPhone} onChange={e => setDeliveryPhone(e.target.value)} className="mt-1" required />
                </div>

                <div>
                  <Label>Delivery Notes (optional)</Label>
                  <Textarea placeholder="Any special instructions for the rider..." value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} className="mt-1" />
                </div>

                <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between"><span>Item:</span><span className="font-medium">HIV Self-Test Kit</span></div>
                  <div className="flex justify-between"><span>Kit Price:</span><span>TZS 15,000</span></div>
                  {deliveryLocation && <div className="flex justify-between"><span>Delivery Fee:</span><span>{formatTZS(calculateDeliveryFee(deliveryDistance))}</span></div>}
                  <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>TZS {(15000 + (deliveryLocation ? calculateDeliveryFee(deliveryDistance) : 0)).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Payment:</span><span>Cash on Delivery</span></div>
                </div>
              </div>

              <Button
                className="w-full flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-lg py-3"
                onClick={handleCODOrder}
                disabled={createCODOrder.isPending || !deliveryLocation || !deliveryPhone || !orderName}
              >
                <Truck className="h-5 w-5" />
                {createCODOrder.isPending ? 'Placing Order...' : 'Place COD Order'}
              </Button>
            </div>
          )}

          {/* ===== CIRCUMCISION BOOKING ===== */}
          {assistantView === 'booking' && (
            <div>
              <Button variant="ghost" size="sm" className="mb-2" onClick={() => setAssistantView('quick')}>← Back to Quick Actions</Button>
              {bookingForm.success ? (
                <div className="text-center py-6 text-green-700">
                  <p>Your appointment has been booked successfully. The clinic will contact you for confirmation.</p>
                  <Button className="mt-4 w-full" onClick={() => { setBookingForm({ name: '', age: '', phone: '', notes: '', loading: false, error: '', success: false }); setAssistantView('quick'); setChatbotOpen(false); }}>Close</Button>
                </div>
              ) : (
                <form onSubmit={async e => {
                  e.preventDefault();
                  setBookingForm(f => ({ ...f, loading: true, error: '' }));
                  try {
                    await appointmentService.createAppointment({
                      user_id: user?.id,
                      provider_id: selectedClinic?.id,
                      appointment_date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
                      appointment_time: selectedTime,
                      service_type: 'circumcision',
                      provider_type: 'lab',
                      status: 'scheduled',
                      notes: `Age: ${bookingForm.age}. ${bookingForm.notes}`,
                    });
                    setBookingForm(f => ({ ...f, loading: false, success: true }));
                  } catch (err: any) {
                    setBookingForm(f => ({ ...f, loading: false, error: err.message || 'Failed to book appointment.' }));
                  }
                }} className="space-y-4">
                  <p className="text-sm">Booking at: <b>{selectedClinic?.business_name || selectedClinic?.name || 'Select a clinic from the main page'}</b></p>
                  <div className="space-y-3">
                    <div><Label>Name:</Label><Input value={bookingForm.name} onChange={e => setBookingForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" required /></div>
                    <div><Label>Age:</Label><Input value={bookingForm.age} onChange={e => setBookingForm(f => ({ ...f, age: e.target.value }))} placeholder="Your age" required type="number" min="15" /></div>
                    <div><Label>Phone:</Label><Input value={bookingForm.phone} onChange={e => setBookingForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" required /></div>
                    <div><Label>Notes (optional):</Label><Input value={bookingForm.notes} onChange={e => setBookingForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes for the clinic?" /></div>
                    <div>
                      <Label>Preferred Date:</Label>
                      <DatePicker selected={selectedDate} onChange={(date: Date) => setSelectedDate(date)} minDate={new Date()} className="border rounded px-2 py-1 w-full" required />
                    </div>
                    <div>
                      <Label>Preferred Time:</Label>
                      <select className="border rounded px-2 py-1 w-full" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} required>
                        <option value="">Select time</option>
                        {timeOptions.map(time => {
                          const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
                          const isBooked = bookedSlots.some(slot => slot.date === dateStr && slot.time === time);
                          return <option key={time} value={time} disabled={isBooked}>{time} {isBooked ? '(Booked)' : ''}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  {bookingForm.error && <div className="text-destructive text-sm">{bookingForm.error}</div>}
                  <Button className="w-full" type="submit" disabled={bookingForm.loading}>{bookingForm.loading ? 'Booking...' : 'Book Appointment'}</Button>
                </form>
              )}
            </div>
          )}

          {/* ===== FAQ / CHAT ===== */}
          {assistantView === 'chat' && (
            <div>
              <Button variant="ghost" size="sm" className="mb-2" onClick={() => setAssistantView('quick')}>← Back to Quick Actions</Button>
              <div className="space-y-2 max-h-96 overflow-y-auto mb-2">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={msg.from === 'bot' ? 'text-left' : 'text-right'}>
                    <span className={msg.from === 'bot' ? 'bg-muted px-3 py-2 rounded-lg inline-block' : 'bg-primary/10 px-3 py-2 rounded-lg inline-block'}>
                      {msg.text}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={e => { e.preventDefault(); handleChatSubmit(); }} className="flex gap-2">
                <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type your message..." autoFocus />
                <Button type="submit">Send</Button>
              </form>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setChatbotOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PersonalHealth;