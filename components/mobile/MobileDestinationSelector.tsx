'use client';

import { useState } from 'react';
import { ChevronDown, MapPin, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface MobileDestinationSelectorProps {
  destinations: string[];
  onDestinationSelect: (destination: string) => void;
}

export default function MobileDestinationSelector({
  destinations,
  onDestinationSelect,
}: MobileDestinationSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<string>('');

  const handleDestinationClick = (destination: string) => {
    setSelectedDestination(destination);
    setIsDropdownOpen(false);
  };

  const handleContinue = () => {
    if (selectedDestination) {
      onDestinationSelect(selectedDestination);
    }
  };

  return (
    <div className="space-y-6">
      {/* Destination Selection */}
      <Card className="shadow-xl bg-white/95 backdrop-blur-sm border border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center text-xl text-gray-900">
            <MapPin className="w-6 h-6 mr-3 text-primary" />
            Select Your Destination
          </CardTitle>
          <CardDescription className="text-gray-600">
            Choose where you want to go on campus
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Custom Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full p-4 text-left bg-gray-50/80 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <span className={selectedDestination ? 'text-gray-900' : 'text-gray-500'}>
                {selectedDestination || 'Choose destination...'}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                {destinations.map((destination, index) => (
                  <button
                    key={index}
                    onClick={() => handleDestinationClick(destination)}
                    className="w-full p-4 text-left hover:bg-primary/10 transition-colors border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-primary/10"
                  >
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-3 text-primary" />
                      <span className="text-gray-900">{destination}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            disabled={!selectedDestination}
            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 disabled:bg-gray-300 disabled:text-gray-500"
          >
            Continue to Camera
          </Button>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="shadow-lg bg-white/90 backdrop-blur-sm border border-white/20">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">?</span>
            </div>
            How it works
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>Select your destination from the dropdown above</span>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>Use the camera to capture your current location</span>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>AI + GPS will determine your exact position</span>
            </div>
            <div className="flex items-start">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>Get turn-by-turn navigation to your destination</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-md bg-white/90 backdrop-blur-sm border border-white/20">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl">🤖</span>
            </div>
            <h4 className="font-semibold text-gray-800 text-sm">AI Detection</h4>
            <p className="text-gray-600 text-xs mt-1">VGG16 model for accurate location identification</p>
          </CardContent>
        </Card>

        <Card className="shadow-md bg-white/90 backdrop-blur-sm border border-white/20">
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl">📍</span>
            </div>
            <h4 className="font-semibold text-gray-800 text-sm">GPS Fusion</h4>
            <p className="text-gray-600 text-xs mt-1">60% AI + 40% GPS for precise positioning</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
