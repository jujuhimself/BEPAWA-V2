/// <reference types="@types/google.maps" />
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, RefreshCw, AlertCircle, Locate, Phone, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: typeof google;
    initGoogleMapsTracking: () => void;
  }
}

interface DeliveryTrackingMapProps {
  orderId: string;
  riderId?: string;
  deliveryAddress?: string;
  pickupAddress?: string;
  showRiderControls?: boolean;
  deliveryCoordinates?: { latitude: number; longitude: number };
  pickupCoordinates?: { latitude: number; longitude: number };
  customerName?: string;
  customerPhone?: string;
}

interface RiderLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
}

// Load Google Maps script dynamically
const loadGoogleMapsScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsTracking`;
    script.async = true;
    script.defer = true;

    (window as any).initGoogleMapsTracking = () => {
      resolve();
    };

    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
};

const DeliveryTrackingMap: React.FC<DeliveryTrackingMapProps> = ({
  orderId,
  riderId,
  deliveryAddress,
  pickupAddress,
  showRiderControls = false,
  deliveryCoordinates,
  pickupCoordinates,
  customerName,
  customerPhone
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const riderMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const deliveryMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const pickupMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchId = useRef<number | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Default to Dodoma, Tanzania
  const defaultCenter = { lat: -6.1630, lng: 35.7516 };

  // Fetch API key from edge function
  useEffect(() => {
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

  // Initialize map when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !mapContainer.current || !window.google) return;

    const initializeMap = async () => {
      try {
        let center = defaultCenter;

        if (deliveryCoordinates) {
          center = { lat: deliveryCoordinates.latitude, lng: deliveryCoordinates.longitude };
        } else if (pickupCoordinates) {
          center = { lat: pickupCoordinates.latitude, lng: pickupCoordinates.longitude };
        }

        mapRef.current = new google.maps.Map(mapContainer.current!, {
          center,
          zoom: 14,
          mapId: 'bepawa-tracking-map',
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

        // Add rider marker
        const riderContent = document.createElement('div');
        riderContent.innerHTML = '🏍️';
        riderContent.style.fontSize = '32px';
        riderContent.style.cursor = 'pointer';

        riderMarkerRef.current = new AdvancedMarkerElement({
          map: mapRef.current,
          position: center,
          content: riderContent,
        });

        // Add pickup marker (pharmacy)
        if (pickupCoordinates) {
          const pickupContent = document.createElement('div');
          pickupContent.innerHTML = '🏥';
          pickupContent.style.fontSize = '32px';

          pickupMarkerRef.current = new AdvancedMarkerElement({
            map: mapRef.current,
            position: { lat: pickupCoordinates.latitude, lng: pickupCoordinates.longitude },
            content: pickupContent,
          });
        }

        // Add delivery destination marker
        if (deliveryCoordinates) {
          const destContent = document.createElement('div');
          destContent.innerHTML = '📍';
          destContent.style.fontSize = '32px';

          deliveryMarkerRef.current = new AdvancedMarkerElement({
            map: mapRef.current,
            position: { lat: deliveryCoordinates.latitude, lng: deliveryCoordinates.longitude },
            content: destContent,
          });
        }

        // Fit bounds if we have both pickup and delivery
        if (pickupCoordinates && deliveryCoordinates) {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend({ lat: pickupCoordinates.latitude, lng: pickupCoordinates.longitude });
          bounds.extend({ lat: deliveryCoordinates.latitude, lng: deliveryCoordinates.longitude });
          mapRef.current.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
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
      if (riderMarkerRef.current) riderMarkerRef.current.map = null;
      if (deliveryMarkerRef.current) deliveryMarkerRef.current.map = null;
      if (pickupMarkerRef.current) pickupMarkerRef.current.map = null;
    };
  }, [isScriptLoaded, deliveryCoordinates, pickupCoordinates]);

  // Subscribe to rider location updates
  useEffect(() => {
    if (!riderId || !orderId) return;

    const channel = supabase
      .channel(`rider-location-${orderId}`)
      .on('broadcast', { event: 'location_update' }, (payload) => {
        const location = payload.payload as RiderLocation;
        setRiderLocation(location);

        // Update marker position
        if (riderMarkerRef.current && mapRef.current) {
          riderMarkerRef.current.position = { lat: location.latitude, lng: location.longitude };
          mapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [riderId, orderId]);

  // Start tracking rider location (for rider's device)
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setIsTracking(true);

    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const location: RiderLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString()
        };

        setRiderLocation(location);

        // Broadcast location to subscribers
        await supabase.channel(`rider-location-${orderId}`).send({
          type: 'broadcast',
          event: 'location_update',
          payload: location
        });

        // Update marker
        if (riderMarkerRef.current && mapRef.current) {
          riderMarkerRef.current.position = { lat: location.latitude, lng: location.longitude };
          mapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Unable to get location');
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  };

  const openInMaps = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  // Fallback UI when map is not available
  if (error || !apiKey) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <span>Live map unavailable</span>
          </div>

          {/* Fallback tracking info */}
          <div className="space-y-3">
            {pickupAddress && (
              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Pickup Location
                    </p>
                    <p className="text-sm text-muted-foreground">{pickupAddress}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openInMaps(pickupAddress)}
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {deliveryAddress && (
              <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Delivery Location
                    </p>
                    <p className="text-sm text-muted-foreground">{deliveryAddress}</p>
                    {customerName && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" /> {customerName}
                        {customerPhone && (
                          <a href={`tel:${customerPhone}`} className="ml-2 text-primary flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {customerPhone}
                          </a>
                        )}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openInMaps(deliveryAddress)}
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {riderLocation && (
              <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Rider Location</p>
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(riderLocation.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <Badge variant="outline" className="bg-background">
                  {riderLocation.latitude.toFixed(4)}, {riderLocation.longitude.toFixed(4)}
                </Badge>
              </div>
            )}
          </div>

          {/* Rider controls */}
          {showRiderControls && (
            <div className="flex gap-2">
              {!isTracking ? (
                <Button onClick={startTracking} className="flex-1">
                  <Locate className="h-4 w-4 mr-2" />
                  Start Sharing Location
                </Button>
              ) : (
                <Button onClick={stopTracking} variant="destructive" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Stop Sharing
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        <div ref={mapContainer} className="h-64 w-full" />

        {/* Location info overlay */}
        <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur p-2 rounded-lg text-xs space-y-1">
          {riderLocation && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last update:</span>
              <span>{new Date(riderLocation.timestamp).toLocaleTimeString()}</span>
            </div>
          )}
          {deliveryAddress && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-green-600" />
              <span className="truncate">{deliveryAddress}</span>
            </div>
          )}
        </div>

        {/* Rider controls */}
        {showRiderControls && (
          <div className="absolute top-2 right-2">
            {!isTracking ? (
              <Button size="sm" onClick={startTracking}>
                <Locate className="h-4 w-4 mr-1" />
                Share Location
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={stopTracking}>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Stop
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryTrackingMap;
