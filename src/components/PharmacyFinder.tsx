import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Star, Clock, Phone, Navigation, ShoppingCart, Loader2, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { fetchPharmacyProfiles, PharmacyProfile } from "@/services/pharmacyDirectoryService";

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
  profilePhotoUrl?: string;
}

const PharmacyFinder = () => {
  const [searchLocation, setSearchLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadPharmacies = async () => {
      setIsLoading(true);
      try {
        const profiles = await fetchPharmacyProfiles();
        const mappedPharmacies: Pharmacy[] = profiles.map((profile) => ({
          id: profile.id,
          name: profile.name,
          address: profile.address,
          phone: profile.phone,
          rating: 4.5 + Math.random() * 0.5,
          distance: `${(Math.random() * 5).toFixed(1)} km`,
          isOpen: true,
          operatingHours: profile.operatingHours,
          services: ["Prescription", "OTC Medicines", "Delivery"]
        }));
        setPharmacies(mappedPharmacies);
      } catch (error) {
        console.error('Error fetching pharmacies:', error);
        setPharmacies([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadPharmacies();
  }, []);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setSearchLocation("Current Location");
          toast({ title: "Location Found", description: "Using your current location" });
        },
        () => {
          toast({ title: "Location Error", description: "Unable to get your location. Please enter manually.", variant: "destructive" });
        }
      );
    }
  };

  const handleViewProducts = (pharmacyId: string) => navigate(`/pharmacy-store/${pharmacyId}`);
  const handleCall = (phone: string) => { window.location.href = `tel:${phone}`; };
  const handleDirections = (address: string) => { window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank'); };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Find Nearby Pharmacies</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-2">Loading pharmacies...</span></CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Find Nearby Pharmacies</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Input placeholder="Search pharmacies by name, address, or services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          <div className="flex gap-2">
            <Input placeholder="Enter your location or area" value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)} className="flex-1" />
            <Button variant="outline" onClick={handleGetCurrentLocation} className="shrink-0"><Navigation className="h-4 w-4 mr-2" />Use Current</Button>
          </div>
        </div>

        {pharmacies.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pharmacies found in your area.</p>
            <p className="text-sm">Try searching a different location.</p>
          </div>
        )}

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
                    <p className="text-muted-foreground text-sm flex items-center gap-1"><MapPin className="h-3 w-3" />{pharmacy.address}</p>
                    <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1"><Phone className="h-3 w-3" />{pharmacy.phone}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span className="font-medium">{pharmacy.rating.toFixed(1)}</span></div>
                    <p className="text-sm text-muted-foreground">{pharmacy.distance}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={pharmacy.isOpen ? "default" : "secondary"}><Clock className="h-3 w-3 mr-1" />{pharmacy.isOpen ? "Open" : "Closed"}</Badge>
                  <span className="text-sm text-muted-foreground">{pharmacy.operatingHours}</span>
                </div>
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Services:</p>
                  <div className="flex flex-wrap gap-1">
                    {pharmacy.services.map((service, index) => (<Badge key={index} variant="outline" className="text-xs">{service}</Badge>))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => handleViewProducts(pharmacy.id)}><ShoppingCart className="h-4 w-4 mr-2" />View Products</Button>
                  <Button size="sm" variant="outline" onClick={() => handleCall(pharmacy.phone)}>Call</Button>
                  <Button size="sm" variant="outline" onClick={() => handleDirections(pharmacy.address)}>Directions</Button>
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
