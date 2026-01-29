/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Locate, Search, AlertCircle, Check, Loader2 } from 'lucide-react';

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

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

// Load Google Maps script dynamically
const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    (window as any).initGoogleMaps = () => {
      resolve();
    };

    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
};

const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
  pharmacyLocation,
  placeholder = 'Search for your delivery location...'
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const pharmacyMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(initialLocation || null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Default to Dodoma, Tanzania
  const defaultCenter = { lat: -6.1630, lng: 35.7516 };

  // Get the API key from Supabase edge function
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    // Fetch API key from edge function
    const fetchApiKey = async () => {
      try {
        const response = await fetch(
          `https://frgblvloxhcnwrgvjazk.supabase.co/functions/v1/google-maps-config`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        if (!response.ok) throw new Error('Failed to fetch API key');
        const data = await response.json();
        setApiKey(data.apiKey);
      } catch (err) {
        console.error('Error fetching Google Maps API key:', err);
        setError('Map configuration pending');
        setIsLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  useEffect(() => {
    if (!apiKey) return;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        setIsScriptLoaded(true);
      })
      .catch((err) => {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load maps');
        setIsLoading(false);
      });
  }, [apiKey]);

  useEffect(() => {
    if (!isScriptLoaded || !mapContainer.current || !window.google) return;

    const initializeMap = async () => {
      try {
        const center = initialLocation
          ? { lat: initialLocation.latitude, lng: initialLocation.longitude }
          : defaultCenter;

        // Initialize the map
        mapRef.current = new google.maps.Map(mapContainer.current!, {
          center,
          zoom: 14,
          mapId: 'bepawa-delivery-map',
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        // Create draggable marker using AdvancedMarkerElement
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
        
        const markerContent = document.createElement('div');
        markerContent.innerHTML = '📍';
        markerContent.style.fontSize = '40px';
        markerContent.style.cursor = 'grab';

        markerRef.current = new AdvancedMarkerElement({
          map: mapRef.current,
          position: center,
          gmpDraggable: true,
          content: markerContent,
        });

        // Handle marker drag end
        markerRef.current.addListener('dragend', async () => {
          const position = markerRef.current?.position;
          if (position) {
            const lat = typeof position.lat === 'function' ? position.lat() : position.lat;
            const lng = typeof position.lng === 'function' ? position.lng() : position.lng;
            await reverseGeocode(lat, lng);
          }
        });

        // Handle map click
        mapRef.current.addListener('click', async (e: google.maps.MapMouseEvent) => {
          if (e.latLng && markerRef.current) {
            markerRef.current.position = e.latLng;
            await reverseGeocode(e.latLng.lat(), e.latLng.lng());
          }
        });

        // Add pharmacy marker if provided
        if (pharmacyLocation) {
          const pharmacyContent = document.createElement('div');
          pharmacyContent.innerHTML = '🏥';
          pharmacyContent.style.fontSize = '32px';

          pharmacyMarkerRef.current = new AdvancedMarkerElement({
            map: mapRef.current,
            position: { lat: pharmacyLocation.latitude, lng: pharmacyLocation.longitude },
            content: pharmacyContent,
          });
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
      if (markerRef.current) {
        markerRef.current.map = null;
      }
      if (pharmacyMarkerRef.current) {
        pharmacyMarkerRef.current.map = null;
      }
    };
  }, [isScriptLoaded, initialLocation, pharmacyLocation]);

  // Setup Places Autocomplete
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'tz' },
      fields: ['formatted_address', 'geometry', 'name'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        const location: LocationData = {
          latitude: lat,
          longitude: lng,
          address: place.formatted_address || '',
          placeName: place.name,
        };

        setSelectedLocation(location);
        onLocationSelect(location);
        setSearchQuery(place.name || place.formatted_address || '');

        if (markerRef.current && mapRef.current) {
          markerRef.current.position = { lat, lng };
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(16);
        }
      }
    });
  }, [isScriptLoaded, onLocationSelect]);

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!window.google?.maps) return;

    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });

      if (response.results && response.results.length > 0) {
        const place = response.results[0];
        const location: LocationData = {
          latitude: lat,
          longitude: lng,
          address: place.formatted_address,
          placeName: place.address_components?.[0]?.short_name,
        };
        setSelectedLocation(location);
        onLocationSelect(location);
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
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

        if (markerRef.current && mapRef.current) {
          markerRef.current.position = { lat: latitude, lng: longitude };
          mapRef.current.panTo({ lat: latitude, lng: longitude });
          mapRef.current.setZoom(16);
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
  if (error && !apiKey) {
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
                latitude: defaultCenter.lat,
                longitude: defaultCenter.lng,
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
              ref={inputRef}
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
      </div>

      {/* Map Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
