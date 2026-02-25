import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Clock, Phone, Navigation, ShoppingCart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  rating: number;
  distance: string;
  isOpen: boolean;
  operatingHours: string;
  services: string[];
}

const PharmacyFinder = () => {
  const [searchLocation, setSearchLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch real pharmacies from Supabase
  useEffect(() => {
    const fetchPharmacies = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'retail')
          .eq('is_approved', true)
          .limit(50);

        if (error) throw error;

        // Get all staff member user_ids to filter them out
        // Staff accounts have their profile id as user_id in staff_members table
        const profileIds = (data || []).map((p: any) => p.id);
        let staffUserIds = new Set<string>();
        if (profileIds.length > 0) {
          const { data: staffData } = await supabase
            .from('staff_members')
            .select('user_id')
            .in('user_id', profileIds);
          staffUserIds = new Set((staffData || []).map((s: any) => s.user_id).filter(Boolean));
        }

        // Also check: real pharmacies typically have pharmacy_name set
        // Staff accounts that got role='retail' via ensureStaffProfileRole won't have it

        // Map to Pharmacy interface - filter out staff accounts
        const mappedPharmacies: Pharmacy[] = (data || [])
          .filter((profile: any) => {
            // Exclude if this profile is a staff member
            if (staffUserIds.has(profile.id)) return false;
            // Exclude if no pharmacy_name and no business_name (likely a staff account with role changed to retail)
            if (!profile.pharmacy_name && !profile.business_name) return false;
            return true;
          })
          .map((profile: any) => ({
          id: profile.id,
          name: profile.pharmacy_name || profile.business_name || profile.name || 'Pharmacy',
          address: profile.address || `${profile.city || ''}, ${profile.region || 'Tanzania'}`.trim().replace(/^,\s*/, ''),
          phone: profile.phone || 'N/A',
          rating: 4.5 + Math.random() * 0.5,
          distance: `${(Math.random() * 5).toFixed(1)} km`,
          isOpen: true,
          operatingHours: profile.operating_hours || "8:00 AM - 9:00 PM",
          services: ["Prescription", "OTC Medicines", "Delivery"]
        }));

        setPharmacies(mappedPharmacies);
      } catch (error) {
        console.error('Error fetching pharmacies:', error);
        // Fallback to sample data if fetch fails
        setPharmacies([
          {
            id: "sample-1",
            name: "City Pharmacy",
            address: "Kisutu Street, Dar es Salaam",
            phone: "+255 22 211 3456",
            rating: 4.8,
            distance: "0.5 km",
            isOpen: true,
            operatingHours: "8:00 AM - 10:00 PM",
            services: ["Prescription", "OTC Medicines", "Consultation", "Delivery"]
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPharmacies();
  }, []);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setSearchLocation("Current Location");
          toast({
            title: "Location Found",
            description: "Using your current location",
          });
        },
        () => {
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please enter manually.",
            variant: "destructive",
          });
        }
      );
    }
  };

  const handleViewProducts = (pharmacyId: string) => {
    // Navigate to the pharmacy store page
    navigate(`/pharmacy-store/${pharmacyId}`);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleDirections = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Find Nearby Pharmacies
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading pharmacies...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Find Nearby Pharmacies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Pharmacies */}
        <div className="space-y-2">
          <Input
            placeholder="Search pharmacies by name, address, or services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Enter your location or area"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              onClick={handleGetCurrentLocation}
              className="shrink-0"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Use Current
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {pharmacies.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pharmacies found in your area.</p>
            <p className="text-sm">Try searching a different location.</p>
          </div>
        )}

        {/* Pharmacy List */}
        <div className="space-y-4">
          {pharmacies
            .filter(p => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.services.some(s => s.toLowerCase().includes(q));
            })
            .map((pharmacy) => (
            <Card key={pharmacy.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{pharmacy.name}</h3>
                    <p className="text-muted-foreground text-sm flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {pharmacy.address}
                    </p>
                    <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" />
                      {pharmacy.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{pharmacy.rating.toFixed(1)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{pharmacy.distance}</p>
                  </div>
                </div>

                {/* Operating Hours & Status */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={pharmacy.isOpen ? "default" : "secondary"}>
                    <Clock className="h-3 w-3 mr-1" />
                    {pharmacy.isOpen ? "Open" : "Closed"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{pharmacy.operatingHours}</span>
                </div>

                {/* Services */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Services:</p>
                  <div className="flex flex-wrap gap-1">
                    {pharmacy.services.map((service, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleViewProducts(pharmacy.id)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    View Products
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleCall(pharmacy.phone)}
                  >
                    Call
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDirections(pharmacy.address)}
                  >
                    Directions
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PharmacyFinder;
