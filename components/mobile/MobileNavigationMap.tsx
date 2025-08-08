'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Camera, Navigation, MapPin, Clock, Route } from 'lucide-react';
import { campusLocations } from '@/lib/campus-data';

interface MobileNavigationMapProps {
  sourceLocation: string;
  destinationLocation: string;
  onRetakePhoto: () => void;
  onBackToDestination: () => void;
}

interface RouteInstruction {
  text: string;
  distance: string;
  time: string;
  direction: string;
}

// Custom routing component
function RoutingMachine({ sourceLocation, destinationLocation }: {
  sourceLocation: string;
  destinationLocation: string;
}) {
  const map = useMap();
  const routingControlRef = useRef<L.Routing.Control | null>(null);
  const [instructions, setInstructions] = useState<RouteInstruction[]>([]);
  const [totalDistance, setTotalDistance] = useState<string>('');
  const [totalTime, setTotalTime] = useState<string>('');

  useEffect(() => {
    if (!map) return;

    const source = campusLocations.find(loc => loc.name === sourceLocation);
    const destination = campusLocations.find(loc => loc.name === destinationLocation);

    if (!source || !destination) return;

    // Remove existing routing control
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    // Create new routing control
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(source.lat, source.lng),
        L.latLng(destination.lat, destination.lng)
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      createMarker: function(i: number, waypoint: L.Routing.Waypoint) {
        const isSource = i === 0;
        const icon = L.divIcon({
          html: `<div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
            isSource ? 'bg-green-600' : 'bg-red-600'
          }">${isSource ? 'S' : 'D'}</div>`,
          className: 'custom-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
        
        return L.marker(waypoint.latLng, { icon });
      },
      lineOptions: {
        styles: [
          { color: '#3B82F6', weight: 6, opacity: 0.8 }
        ]
      },
      show: false, // Hide the default instruction panel
    }).on('routesfound', function(e) {
      const routes = e.routes;
      const summary = routes[0].summary;
      
      // Format distance and time
      const distance = (summary.totalDistance / 1000).toFixed(1) + ' km';
      const time = Math.round(summary.totalTime / 60) + ' min';
      
      setTotalDistance(distance);
      setTotalTime(time);

      // Extract turn-by-turn instructions
      const routeInstructions: RouteInstruction[] = routes[0].instructions.map((instruction: any) => ({
        text: instruction.text,
        distance: (instruction.distance / 1000).toFixed(1) + ' km',
        time: Math.round(instruction.time / 60) + ' min',
        direction: instruction.direction || 'straight'
      }));

      setInstructions(routeInstructions.slice(0, 5)); // Show first 5 instructions
    });

    routingControl.addTo(map);
    routingControlRef.current = routingControl;

    // Fit map to show both points
    const group = new L.FeatureGroup([
      L.marker([source.lat, source.lng]),
      L.marker([destination.lat, destination.lng])
    ]);
    map.fitBounds(group.getBounds().pad(0.1));

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, sourceLocation, destinationLocation]);

  return null;
}

export default function MobileNavigationMap({
  sourceLocation,
  destinationLocation,
  onRetakePhoto,
  onBackToDestination,
}: MobileNavigationMapProps) {
  const [instructions, setInstructions] = useState<RouteInstruction[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [totalDistance, setTotalDistance] = useState<string>('');
  const [totalTime, setTotalTime] = useState<string>('');

  const source = campusLocations.find(loc => loc.name === sourceLocation);
  const destination = campusLocations.find(loc => loc.name === destinationLocation);

  if (!source || !destination) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">Error: Could not find location coordinates</p>
        <Button onClick={onBackToDestination} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToDestination}
          className="flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="text-center">
          <h2 className="font-semibold text-gray-900">Navigation</h2>
          <p className="text-sm text-gray-600">Route to {destinationLocation}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetakePhoto}
          className="flex items-center"
        >
          <Camera className="w-4 h-4" />
        </Button>
      </div>

      {/* Route Summary */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Navigation className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Route Found</h3>
                <p className="text-blue-100 text-sm">
                  {totalDistance && totalTime ? `${totalDistance} • ${totalTime}` : 'Calculating...'}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowInstructions(!showInstructions)}
              className="bg-white/20 text-white border-0 hover:bg-white/30"
            >
              <Route className="w-4 h-4 mr-2" />
              {showInstructions ? 'Hide' : 'Show'} Steps
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Turn-by-turn Instructions */}
      {showInstructions && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Route className="w-5 h-5 mr-2 text-blue-600" />
              Turn-by-turn Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {instructions.length > 0 ? (
              instructions.map((instruction, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">{instruction.text}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {instruction.distance}
                      </span>
                      <span className="text-sm text-gray-600 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {instruction.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Route className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Loading route instructions...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Map */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="h-96 relative">
            <MapContainer
              center={[source.lat, source.lng]}
              zoom={16}
              className="h-full w-full"
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <RoutingMachine 
                sourceLocation={sourceLocation} 
                destinationLocation={destinationLocation} 
              />

              {/* Source marker */}
              <Marker 
                position={[source.lat, source.lng]}
                icon={L.divIcon({
                  html: '<div class="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">S</div>',
                  className: 'custom-marker',
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                })}
              >
                <Popup>
                  <div className="text-center">
                    <strong>Source</strong><br />
                    {sourceLocation}
                  </div>
                </Popup>
              </Marker>

              {/* Destination marker */}
              <Marker 
                position={[destination.lat, destination.lng]}
                icon={L.divIcon({
                  html: '<div class="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">D</div>',
                  className: 'custom-marker',
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                })}
              >
                <Popup>
                  <div className="text-center">
                    <strong>Destination</strong><br />
                    {destinationLocation}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {/* Map controls overlay */}
            <div className="absolute top-4 right-4 z-[1000] space-y-2">
              <Button
                size="sm"
                className="bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 shadow-lg"
                onClick={() => {
                  // Zoom to fit route
                  const map = document.querySelector('.leaflet-container') as any;
                  if (map && map._leaflet_map) {
                    const group = new L.FeatureGroup([
                      L.marker([source.lat, source.lng]),
                      L.marker([destination.lat, destination.lng])
                    ]);
                    map._leaflet_map.fitBounds(group.getBounds().pad(0.1));
                  }
                }}
              >
                Fit Route
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Details */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-green-600 rounded-full mr-2"></div>
              <span className="font-semibold text-green-800">Source</span>
            </div>
            <p className="text-green-700 text-sm">{sourceLocation}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-red-600 rounded-full mr-2"></div>
              <span className="font-semibold text-red-800">Destination</span>
            </div>
            <p className="text-red-700 text-sm">{destinationLocation}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
