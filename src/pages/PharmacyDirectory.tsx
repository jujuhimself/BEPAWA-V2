import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, Star, Clock, Phone, ShoppingCart } from "lucide-react";
import PharmacyCard from "@/components/PharmacyCard";
import PharmacyStockDialog from "@/components/PharmacyStockDialog";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PharmacyAppointmentScheduler from "@/components/pharmacy/PharmacyAppointmentScheduler";
import { useNavigate } from "react-router-dom";

interface Pharmacy {
  id: string;
  name: string;
  location: string;
  rating: number;
  distance: string;
  isOpen: boolean;
  hours: string;
  phone: string;
  stock: any[];
}

interface PharmacyDirectoryProps {
  onSelectPharmacy?: (pharmacy: Pharmacy) => void;
  hideHeader?: boolean;
}

const PharmacyDirectory = ({ onSelectPharmacy, hideHeader }: PharmacyDirectoryProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [orderModal, setOrderModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [pharmacyForAppointment, setPharmacyForAppointment] = useState<Pharmacy | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPharmacies();
  }, []);

  const fetchPharmacies = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, business_name, pharmacy_name, region, city, phone, address, is_approved, operating_hours')
        .eq('role', 'retail')
        .eq('is_approved', true)
        .order('business_name');

      if (error) throw error;

      // Fetch products for all pharmacies
      const pharmacyIds = (data || []).map((pharmacy: any) => pharmacy.id);
      let allStock: Record<string, any[]> = {};
      if (pharmacyIds.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, sell_price, stock, pharmacy_id')
          .in('pharmacy_id', pharmacyIds);
        if (productsError) throw productsError;
        // Group products by pharmacy_id
        allStock = (productsData || []).reduce((acc: Record<string, any[]>, product: any) => {
          if (!acc[product.pharmacy_id]) acc[product.pharmacy_id] = [];
          acc[product.pharmacy_id].push({
            name: product.name,
            price: product.sell_price,
            available: product.stock > 0
          });
          return acc;
        }, {});
      }

      const pharmacyData: Pharmacy[] = (data || []).map((pharmacy: any) => ({
        id: pharmacy.id,
        name: pharmacy.pharmacy_name || pharmacy.business_name || pharmacy.name || 'Pharmacy',
        location: pharmacy.address || ((pharmacy.city && pharmacy.region) ? `${pharmacy.city}, ${pharmacy.region}` : 'Location not set'),
        rating: 4.5, // Default rating
        distance: 'N/A', // Would need location services for real distance
        isOpen: true, // Default to open
        hours: pharmacy.operating_hours || '8:00 AM - 8:00 PM',
        phone: pharmacy.phone || 'N/A',
        stock: allStock[pharmacy.id] || []
      }));

      setPharmacies(pharmacyData);
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
      toast({
        title: "Error",
        description: "Failed to load pharmacies",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPharmacies = pharmacies.filter(pharmacy =>
    pharmacy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pharmacy.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOrder = () => {
    if (selectedMedicine && quantity > 0) {
      // Place order logic stub
      setOrderModal(false);
      setSelectedMedicine("");
      setQuantity(1);
      toast({
        title: "Order Placed",
        description: "Your order has been placed successfully!",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pharmacies...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <PageHeader 
          title="Find Pharmacies"
          description="Discover nearby pharmacies and order medicines"
          badge={{ text: "Healthcare", variant: "outline" }}
        />
        
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search by pharmacy name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>
        
        {/* Pharmacy Grid */}
        {filteredPharmacies.length === 0 ? (
          <EmptyState
            title="No pharmacies found"
            description={searchTerm 
              ? "No pharmacies match your search criteria." 
              : "Pharmacy directory will be populated as pharmacies join the platform. Check back soon for available pharmacies in your area."}
            icon={<MapPin className="h-16 w-16" />}
            variant="card"
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPharmacies.map((pharmacy) => (
              <Card key={pharmacy.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{pharmacy.name}</CardTitle>
                      <p className="text-gray-600 flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {pharmacy.location}
                      </p>
                      {pharmacy.phone && pharmacy.phone !== 'N/A' && (
                        <p className="text-gray-600 flex items-center mt-1">
                          <Phone className="h-4 w-4 mr-1" />
                          {pharmacy.phone}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="ml-1 font-medium">{pharmacy.rating}</span>
                      </div>
                      <p className="text-sm text-gray-500">{pharmacy.distance}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant={pharmacy.isOpen ? "default" : "secondary"}>
                        <Clock className="h-3 w-3 mr-1" />
                        {pharmacy.isOpen ? "Open" : "Closed"}
                      </Badge>
                      <span className="text-sm text-gray-600">{pharmacy.hours}</span>
                    </div>
                    <div className="flex flex-col gap-2 pt-2 w-full">
                      <Button size="sm" className="w-full" onClick={() => navigate(`/pharmacy/${pharmacy.id}`)}>
                        View Store
                      </Button>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => { setPharmacyForAppointment(pharmacy); setShowAppointmentDialog(true); onSelectPharmacy && onSelectPharmacy(pharmacy); }}>
                        Schedule Appointment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Pharmacy Details Modal */}
        {selectedPharmacy && (
          <PharmacyStockDialog
            open={!!selectedPharmacy}
            onOpenChange={() => setSelectedPharmacy(null)}
            pharmacyName={selectedPharmacy.name}
            stock={selectedPharmacy.stock}
            onOrder={(medicine: string) => {
              setSelectedMedicine(medicine);
              setOrderModal(true);
            }}
          />
        )}
        
        {/* Order Modal */}
        <Dialog open={orderModal} onOpenChange={setOrderModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Order Medicine</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Medicine</label>
                <Input value={selectedMedicine} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <Input 
                  type="number" 
                  value={quantity} 
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  min="1"
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleOrder} className="flex-1">Confirm Order</Button>
                <Button variant="outline" onClick={() => setOrderModal(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Appointment Scheduler Dialog */}
        <PharmacyAppointmentScheduler
          isOpen={showAppointmentDialog}
          onClose={() => setShowAppointmentDialog(false)}
          onAppointmentCreated={() => setShowAppointmentDialog(false)}
          pharmacy={pharmacyForAppointment ? { id: pharmacyForAppointment.id, name: pharmacyForAppointment.name } : undefined}
        />
      </div>
    </div>
  );
};

export default PharmacyDirectory;
