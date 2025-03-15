'use client';

import { useState } from 'react';
import { Check, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationSelectorProps {
  locations: string[];
  currentLocation: string;
  onSelect: (location: string) => void;
  selectedLocation: string | null;
}

export default function LocationSelector({ 
  locations, 
  currentLocation, 
  onSelect, 
  selectedLocation 
}: LocationSelectorProps) {
  // Filter out the current location from the options
  const destinationOptions = locations.filter(loc => loc !== currentLocation);

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">Select Your Destination:</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {destinationOptions.map((location) => (
          <div
            key={location}
            className={cn(
              "flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
              selectedLocation === location 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
            onClick={() => onSelect(location)}
          >
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              selectedLocation === location ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              {selectedLocation === location ? (
                <Check className="h-5 w-5" />
              ) : (
                <MapPin className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="text-sm font-medium">{location}</div>
          </div>
        ))}
      </div>
    </div>
  );
}