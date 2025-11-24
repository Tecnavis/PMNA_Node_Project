// components/RouteBookingMap.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapLocation {
  lat: number;
  lng: number;
  name?: string;
  type: 'pickup' | 'driver' | 'provider';
  distance?: string;
}

interface RouteBookingMapProps {
  pickupLocation: MapLocation | null;
  drivers: Array<{
    _id: string;
    name: string;
    currentLocation?: string;
    distance?: string;
  }>;
  providers: Array<{
    _id: string;
    name: string;
    distance?: string;
  }>;
}

const RouteBookingMap: React.FC<RouteBookingMapProps> = ({
  pickupLocation,
  drivers,
  providers
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const labelsRef = useRef<L.DivOverlay[]>([]);
  const linesRef = useRef<L.Polyline[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  // Parse coordinates
  const parseLatLng = useCallback((latLngString: string): [number, number] | null => {
    if (!latLngString) return null;
    try {
      const coords = latLngString.split(',').map(coord => parseFloat(coord.trim()));
      if (coords.length >= 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        return [coords[0], coords[1]];
      }
    } catch (error) {
      console.error('Error parsing coordinates:', error);
    }
    return null;
  }, []);

  // Create custom icon with name
  const createCustomIcon = (color: string, name: string = '', type: string = '') => {
    const isPickup = type === 'pickup';
    const displayName = name.length > 15 ? name.substring(0, 12) + '...' : name;
    
    return L.divIcon({
      html: `
        <div style="position: relative; display: inline-block;">
          <div style="
            background-color: ${color};
            width: ${isPickup ? '16px' : '14px'};
            height: ${isPickup ? '16px' : '14px'};
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
          ${showLabels && name ? `
            <div style="
              position: absolute;
              top: ${isPickup ? '20px' : '18px'};
              left: 50%;
              transform: translateX(-50%);
              background: white;
              padding: 2px 6px;
              border-radius: 4px;
              border: 1px solid #e5e7eb;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              font-size: 10px;
              font-weight: 600;
              white-space: nowrap;
              color: #374151;
              z-index: 1000;
            ">
              ${displayName}
            </div>
          ` : ''}
        </div>
      `,
      className: 'custom-marker',
      iconSize: isPickup ? [16, 16] : [14, 14],
      iconAnchor: isPickup ? [8, 8] : [7, 7],
    });
  };

  const getIcon = (type: 'pickup' | 'driver' | 'provider', name: string = '') => {
    switch (type) {
      case 'pickup': return createCustomIcon('#22c55e', name, 'pickup');
      case 'driver': return createCustomIcon('#3b82f6', name, 'driver');
      case 'provider': return createCustomIcon('#f59e0b', name, 'provider');
      default: return createCustomIcon('#3b82f6', name, 'driver');
    }
  };

  // Calculate distance between two points
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(2) + ' km';
  }, []);

  // Create straight line between two points
  const createLine = (from: [number, number], to: [number, number], type: string, name: string) => {
    if (!mapInstanceRef.current) return null;

    const color = type === 'driver' ? '#3b82f6' : '#f59e0b';
    const line = L.polyline([from, to], {
      color: color,
      weight: 3,
      opacity: 0.7,
      dashArray: '5, 10'
    }).addTo(mapInstanceRef.current);

    // Add label to the line
    const midPoint = L.latLng(
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2
    );

    const label = L.popup({
      autoClose: false,
      closeOnClick: false,
      className: 'line-label-popup'
    })
    .setLatLng(midPoint)
    .setContent(`
      <div style="
        background: white;
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid ${color};
        font-size: 10px;
        font-weight: 600;
        color: ${color};
      ">
        To: ${name}
      </div>
    `)
    .addTo(mapInstanceRef.current);

    labelsRef.current.push(label);

    return line;
  };

  // Toggle line visibility
  const toggleLine = (targetId: string, from: [number, number], to: [number, number], type: string, name: string) => {
    // Remove all existing lines and labels
    linesRef.current.forEach(line => line.remove());
    linesRef.current = [];
    
    labelsRef.current.forEach(label => label.remove());
    labelsRef.current = [];

    if (selectedRoute === targetId) {
      // Deselect
      setSelectedRoute(null);
    } else {
      // Create new line
      const newLine = createLine(from, to, type, name);
      if (newLine) {
        linesRef.current.push(newLine);
        setSelectedRoute(targetId);
        
        // Fit bounds to show both points and line with street-level zoom
        if (mapInstanceRef.current) {
          const bounds = L.latLngBounds([from, to]);
          mapInstanceRef.current.fitBounds(bounds, { 
            padding: [20, 20],
            maxZoom: 16
          });
        }
      }
    }
  };

  // Handle marker click for lines
  const handleMarkerClick = (targetId: string, from: [number, number], to: [number, number], type: string, name: string) => {
    toggleLine(targetId, from, to, type, name);
  };

  // Toggle labels visibility
  const toggleLabels = () => {
    setShowLabels(!showLabels);
    // Refresh markers to update labels
    if (mapInstanceRef.current && pickupLocation) {
      const map = mapInstanceRef.current;
      
      // Remove all markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      
      // Re-add markers with updated labels
      addMarkersToMap(map, pickupLocation);
    }
  };

  // Function to add markers to map
  const addMarkersToMap = (map: L.Map, pickupLocation: MapLocation) => {
    const markers: L.Marker[] = [];
    const locations: L.LatLngTuple[] = [];

    // Add pickup location
    const pickupMarker = L.marker([pickupLocation.lat, pickupLocation.lng], {
      icon: getIcon('pickup', pickupLocation.name || 'Pickup')
    }).addTo(map);
    
    pickupMarker.bindPopup(`
      <div class="text-sm">
        <strong>${pickupLocation.name || 'Pickup Location'}</strong><br/>
        Type: Pickup Location<br/>
        Coordinates: ${pickupLocation.lat.toFixed(6)}, ${pickupLocation.lng.toFixed(6)}
      </div>
    `);
    
    markers.push(pickupMarker);
    locations.push([pickupLocation.lat, pickupLocation.lng]);

    // Add driver locations
    drivers.forEach(driver => {
      if (driver.currentLocation) {
        const coords = parseLatLng(driver.currentLocation);
        if (coords) {
          const distance = calculateDistance(
            pickupLocation.lat, pickupLocation.lng,
            coords[0], coords[1]
          );

          const marker = L.marker(coords, {
            icon: getIcon('driver', driver.name)
          }).addTo(map);
          
          const targetId = `driver-${driver._id}`;
          
          marker.bindPopup(`
            <div class="text-sm">
              <strong>${driver.name}</strong><br/>
              Type: Driver<br/>
              Distance: ${distance}<br/>
              <button 
                class="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                data-target="${targetId}"
              >
                ${selectedRoute === targetId ? 'Hide Line' : 'Show Line'}
              </button>
              <br/>
              Coordinates: ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}
            </div>
          `);
          
          marker.on('popupopen', () => {
            setTimeout(() => {
              const button = document.querySelector(`[data-target="${targetId}"]`);
              if (button) {
                button.addEventListener('click', () => {
                  handleMarkerClick(
                    targetId,
                    [pickupLocation.lat, pickupLocation.lng],
                    coords,
                    'driver',
                    driver.name
                  );
                });
              }
            }, 100);
          });
          
          markers.push(marker);
          locations.push(coords);
        }
      }
    });

    // Add provider locations
    providers.forEach(provider => {
      const providerLocation = (provider as any).currentLocation || (provider as any).location;
      if (providerLocation) {
        const coords = parseLatLng(providerLocation);
        if (coords) {
          const distance = calculateDistance(
            pickupLocation.lat, pickupLocation.lng,
            coords[0], coords[1]
          );

          const marker = L.marker(coords, {
            icon: getIcon('provider', provider.name)
          }).addTo(map);
          
          const targetId = `provider-${provider._id}`;
          
          marker.bindPopup(`
            <div class="text-sm">
              <strong>${provider.name}</strong><br/>
              Type: Provider<br/>
              Distance: ${distance}<br/>
              <button 
                class="mt-2 px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-xs"
                data-target="${targetId}"
              >
                ${selectedRoute === targetId ? 'Hide Line' : 'Show Line'}
              </button>
              <br/>
              Coordinates: ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}
            </div>
          `);
          
          marker.on('popupopen', () => {
            setTimeout(() => {
              const button = document.querySelector(`[data-target="${targetId}"]`);
              if (button) {
                button.addEventListener('click', () => {
                  handleMarkerClick(
                    targetId,
                    [pickupLocation.lat, pickupLocation.lng],
                    coords,
                    'provider',
                    provider.name
                  );
                });
              }
            }, 100);
          });
          
          markers.push(marker);
          locations.push(coords);
        }
      }
    });

    markersRef.current = markers;
    return { markers, locations };
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map with street-level zoom settings
    const map = L.map(mapRef.current, {
      center: pickupLocation ? [pickupLocation.lat, pickupLocation.lng] : [10.984149564566444, 76.18771286441817],
      zoom: 15,
      minZoom: 8,
      maxZoom: 18,
      zoomControl: true
    });
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pickupLocation]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !pickupLocation) return;

    // Clear existing markers, lines and labels
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    linesRef.current.forEach(line => line.remove());
    linesRef.current = [];
    
    labelsRef.current.forEach(label => label.remove());
    labelsRef.current = [];
    
    setSelectedRoute(null);

    // Add markers to map
    const { markers, locations } = addMarkersToMap(map, pickupLocation);

    // Adjust map view with street-level zoom
    if (locations.length > 0) {
      const group = new L.FeatureGroup(markers);
      const bounds = group.getBounds();
      
      if (bounds.isValid()) {
        const boundsSize = bounds.getNorthEast().distanceTo(bounds.getSouthWest());
        
        if (boundsSize < 5000) {
          map.fitBounds(bounds.pad(0.1), {
            padding: [20, 20],
            maxZoom: 16
          });
        } else {
          map.fitBounds(bounds.pad(0.1));
        }
      }
    } else {
      map.setView([pickupLocation.lat, pickupLocation.lng], 15);
    }

  }, [pickupLocation, drivers, providers, parseLatLng, calculateDistance, selectedRoute, showLabels]);

  if (!pickupLocation && drivers.length === 0 && providers.length === 0) {
    return (
      <div className="h-[500px] md:h-[700px] lg:h-[800px] w-full rounded-lg border border-gray-300 flex items-center justify-center">
        <div className="text-gray-500 text-center">
          <p>No locations to display on map</p>
          <p className="text-sm">Please add valid coordinates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[500px] md:h-[700px] lg:h-[800px] w-full rounded-lg border border-gray-300 relative">
      {/* Control Buttons */}
      <div className="absolute top-2 left-2 z-1000 flex gap-2">
        <button
          onClick={toggleLabels}
          className="bg-white px-3 py-2 rounded shadow-lg text-xs font-medium hover:bg-gray-50 border border-gray-300"
        >
          {showLabels ? 'Hide Names' : 'Show Names'}
        </button>
      </div>
      
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 p-2 bg-gray-50 border-t border-gray-200 text-xs">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
          <span>Pickup</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
          <span>Drivers</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-orange-500 rounded-full mr-1"></div>
          <span>Providers</span>
        </div>
        {selectedRoute && (
          <div className="flex items-center">
            <div className="w-4 h-1 bg-blue-500 mr-1"></div>
            <span>Connection Line</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteBookingMap;