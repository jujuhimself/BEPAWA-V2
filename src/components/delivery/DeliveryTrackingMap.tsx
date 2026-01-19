import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, RefreshCw, AlertCircle, Locate, Phone, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  const map = useRef<any>(null);
  const riderMarker = useRef<any>(null);
  const deliveryMarker = useRef<any>(null);
  const pickupMarker = useRef<any>(null);
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchId = useRef<number | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Fetch Mapbox token
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN || null;
    setMapboxToken(token);
    if (!token) {
      setError('Map configuration pending. Contact support if this persists.');
      setIsLoading(false);
    }
  }, []);

  // Initialize map when token is available
  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) return;

    const initializeMap = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        await import('mapbox-gl/dist/mapbox-gl.css');
        
        mapboxgl.accessToken = mapboxToken;
        
        // Default to Dodoma, Tanzania or use provided coordinates
        let defaultCenter: [number, number] = [35.7516, -6.1630];
        
        if (deliveryCoordinates) {
          defaultCenter = [deliveryCoordinates.longitude, deliveryCoordinates.latitude];
        } else if (pickupCoordinates) {
          defaultCenter = [pickupCoordinates.longitude, pickupCoordinates.latitude];
        }
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: defaultCenter,
          zoom: 14,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Add rider marker
        const riderEl = document.createElement('div');
        riderEl.className = 'rider-marker';
        riderEl.innerHTML = '🏍️';
        riderEl.style.fontSize = '32px';
        riderEl.style.cursor = 'pointer';
        
        riderMarker.current = new mapboxgl.Marker({ element: riderEl })
          .setLngLat(defaultCenter)
          .addTo(map.current);

        // Add pickup marker (pharmacy)
        if (pickupCoordinates) {
          const pickupEl = document.createElement('div');
          pickupEl.innerHTML = '🏥';
          pickupEl.style.fontSize = '32px';
          
          pickupMarker.current = new mapboxgl.Marker({ element: pickupEl })
            .setLngLat([pickupCoordinates.longitude, pickupCoordinates.latitude])
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>Pharmacy</strong><br/>${pickupAddress || 'Pickup location'}`))
            .addTo(map.current);
        }

        // Add delivery destination marker
        if (deliveryCoordinates) {
          const destEl = document.createElement('div');
          destEl.innerHTML = '📍';
          destEl.style.fontSize = '32px';
          
          deliveryMarker.current = new mapboxgl.Marker({ element: destEl })
            .setLngLat([deliveryCoordinates.longitude, deliveryCoordinates.latitude])
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>${customerName || 'Customer'}</strong><br/>${deliveryAddress || 'Delivery location'}`))
            .addTo(map.current);
        } else if (deliveryAddress) {
          // Fallback: place marker at offset if no coordinates
          const destEl = document.createElement('div');
          destEl.innerHTML = '📍';
          destEl.style.fontSize = '32px';
          
          new mapboxgl.Marker({ element: destEl })
            .setLngLat([defaultCenter[0] + 0.01, defaultCenter[1] + 0.01])
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>Delivery</strong><br/>${deliveryAddress}`))
            .addTo(map.current);
        }

        // Fit bounds if we have both pickup and delivery
        if (pickupCoordinates && deliveryCoordinates) {
          const bounds = new mapboxgl.LngLatBounds()
            .extend([pickupCoordinates.longitude, pickupCoordinates.latitude])
            .extend([deliveryCoordinates.longitude, deliveryCoordinates.latitude]);
          
          map.current.fitBounds(bounds, { padding: 60 });
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
  }, [mapboxToken, deliveryAddress, deliveryCoordinates, pickupAddress, pickupCoordinates, customerName]);

  // Subscribe to rider location updates
  useEffect(() => {
    if (!riderId || !orderId) return;

    const channel = supabase
      .channel(`rider-location-${orderId}`)
      .on('broadcast', { event: 'location_update' }, (payload) => {
        const location = payload.payload as RiderLocation;
        setRiderLocation(location);
        
        // Update marker position
        if (riderMarker.current && map.current) {
          riderMarker.current.setLngLat([location.longitude, location.latitude]);
          map.current.flyTo({
            center: [location.longitude, location.latitude],
            zoom: 15,
            duration: 1000
          });
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
        if (riderMarker.current && map.current) {
          riderMarker.current.setLngLat([location.longitude, location.latitude]);
          map.current.flyTo({
            center: [location.longitude, location.latitude],
            zoom: 15,
            duration: 500
          });
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
  if (error || !mapboxToken) {
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
            <RefreshCw className="h-6 w-6 animate-spin" />
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
