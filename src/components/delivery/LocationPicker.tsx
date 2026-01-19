import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Locate, Search, AlertCircle, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  placeName?: string;
}

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  initialLocation?: LocationData;
  pharmacyLocation?: { latitude: number; longitude: number };
  placeholder?: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
  pharmacyLocation,
  placeholder = 'Search for your delivery location...'
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const marker = useRef<any>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(initialLocation || null);
  const [isSearching, setIsSearching] = useState(false);

  // Default to Dodoma, Tanzania
  const defaultCenter: [number, number] = [35.7516, -6.1630];

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN || null;
    setMapboxToken(token);
    if (!token) {
      setError('Map configuration pending');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) return;

    const initializeMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        await import('mapbox-gl/dist/mapbox-gl.css');

        mapboxgl.accessToken = mapboxToken;

        const center = initialLocation 
          ? [initialLocation.longitude, initialLocation.latitude] as [number, number]
          : defaultCenter;

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center,
          zoom: 14,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add draggable marker
        const markerEl = document.createElement('div');
        markerEl.innerHTML = '📍';
        markerEl.style.fontSize = '40px';
        markerEl.style.cursor = 'grab';

        marker.current = new mapboxgl.Marker({ 
          element: markerEl, 
          draggable: true 
        })
          .setLngLat(center)
          .addTo(map.current);

        // Handle marker drag end
        marker.current.on('dragend', async () => {
          const lngLat = marker.current.getLngLat();
          await reverseGeocode(lngLat.lat, lngLat.lng);
        });

        // Handle map click
        map.current.on('click', async (e: any) => {
          const { lng, lat } = e.lngLat;
          marker.current.setLngLat([lng, lat]);
          await reverseGeocode(lat, lng);
        });

        // Add pharmacy marker if provided
        if (pharmacyLocation) {
          const pharmacyEl = document.createElement('div');
          pharmacyEl.innerHTML = '🏥';
          pharmacyEl.style.fontSize = '32px';
          
          new mapboxgl.Marker({ element: pharmacyEl })
            .setLngLat([pharmacyLocation.longitude, pharmacyLocation.latitude])
            .addTo(map.current);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to load map');
        setIsLoading(false);
      }
    };

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [mapboxToken, initialLocation, pharmacyLocation]);

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!mapboxToken) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&country=TZ`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const place = data.features[0];
        const location: LocationData = {
          latitude: lat,
          longitude: lng,
          address: place.place_name,
          placeName: place.text,
        };
        setSelectedLocation(location);
        onLocationSelect(location);
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }
  };

  const searchPlaces = useCallback(async (query: string) => {
    if (!mapboxToken || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=TZ&limit=5`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [mapboxToken]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery) {
        searchPlaces(searchQuery);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, searchPlaces]);

  const selectSearchResult = (result: any) => {
    const [lng, lat] = result.center;
    const location: LocationData = {
      latitude: lat,
      longitude: lng,
      address: result.place_name,
      placeName: result.text,
    };

    setSelectedLocation(location);
    onLocationSelect(location);
    setSearchQuery('');
    setSearchResults([]);

    if (marker.current && map.current) {
      marker.current.setLngLat([lng, lat]);
      map.current.flyTo({ center: [lng, lat], zoom: 16 });
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        if (marker.current && map.current) {
          marker.current.setLngLat([longitude, latitude]);
          map.current.flyTo({ center: [longitude, latitude], zoom: 16 });
        }
        
        await reverseGeocode(latitude, longitude);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Unable to get your location');
      },
      { enableHighAccuracy: true }
    );
  };

  // Fallback UI when map is not available
  if (error || !mapboxToken) {
    return (
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>Map unavailable - enter address manually</span>
          </div>
          <Input
            placeholder="Enter your full delivery address"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              const location: LocationData = {
                latitude: defaultCenter[1],
                longitude: defaultCenter[0],
                address: e.target.value,
              };
              onLocationSelect(location);
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            type="button" 
            variant="outline" 
            onClick={useCurrentLocation}
            title="Use current location"
          >
            <Locate className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-auto">
            <CardContent className="p-0">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full p-3 text-left hover:bg-muted border-b last:border-b-0 flex items-start gap-2"
                  onClick={() => selectSearchResult(result)}
                >
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{result.text}</p>
                    <p className="text-xs text-muted-foreground">{result.place_name}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
        <div ref={mapContainer} className="h-64 w-full rounded-lg border" />
        
        {/* Selected Location Badge */}
        {selectedLocation && (
          <div className="absolute bottom-2 left-2 right-2 bg-background/95 backdrop-blur p-2 rounded-lg border shadow-sm">
            <div className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedLocation.placeName || 'Selected Location'}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedLocation.address}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Tap on the map or drag the pin to set your exact delivery location
      </p>
    </div>
  );
};

export default LocationPicker;
