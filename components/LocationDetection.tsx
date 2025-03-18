'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { campusLocations } from '@/lib/campus-data';

// 🔁 Dynamically import components to avoid SSR issues
const ImageUploader = dynamic(() => import('@/components/ImageUploader'), { ssr: false });
const LocationSelector = dynamic(() => import('@/components/LocationSelector'), { ssr: false });
const NavigationMap = dynamic(() => import('@/components/NavigationMap'), { ssr: false });

type LocationState = 'detection' | 'destination' | 'navigation';

export default function LocationDetection() {
  const [locationState, setLocationState] = useState<LocationState>('detection');
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageUpload = (imageDataUrl: string, detectedLocation: string) => {
    setUploadedImage(imageDataUrl);
    setCurrentLocation(detectedLocation);
    setLocationState('destination');
  };

  const handleDestinationSelect = (location: string) => {
    setDestinationLocation(location);
  };

  const handleProceedToNavigation = () => {
    if (!destinationLocation) {
      toast({
        title: "Please select a destination",
        description: "You need to select where you want to go",
        variant: "destructive",
      });
      return;
    }
    setLocationState('navigation');
  };

  const resetProcess = () => {
    setLocationState('detection');
    setCurrentLocation(null);
    setDestinationLocation(null);
    setUploadedImage(null);
  };

  return (
    <section id="location-detection" className="py-16 container">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-8">
          Find Your Way Around Campus
        </h2>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Campus Navigation</CardTitle>
            <CardDescription>
              {locationState === 'detection' && "Upload a photo of your surroundings to detect your location"}
              {locationState === 'destination' && "Select where you want to go"}
              {locationState === 'navigation' && "Follow the route to your destination"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {locationState === 'detection' && (
              <div className="space-y-6">
                <ImageUploader onImageUpload={handleImageUpload} />
              </div>
            )}

            {locationState === 'destination' && (
              <div className="space-y-6">
                <div className="p-4 bg-muted rounded-lg mb-6">
                  <h3 className="font-medium mb-2">Your Current Location:</h3>
                  <p className="text-xl font-bold">{currentLocation}</p>
                  {uploadedImage && (
                    <img
                      src={uploadedImage}
                      alt="Uploaded location"
                      className="mt-4 max-h-[200px] rounded-md object-contain"
                    />
                  )}
                </div>

                <LocationSelector
                  locations={campusLocations.map(loc => loc.name)}
                  currentLocation={currentLocation || ''}
                  onSelect={handleDestinationSelect}
                  selectedLocation={destinationLocation}
                />
              </div>
            )}

            {locationState === 'navigation' && currentLocation && destinationLocation && (
              <div className="space-y-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-medium">From:</h3>
                    <p className="font-bold">{currentLocation}</p>
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-medium">To:</h3>
                    <p className="font-bold">{destinationLocation}</p>
                  </div>
                </div>

                <div className="h-[400px] w-full rounded-lg overflow-hidden border">
                  <NavigationMap
                    startLocation={currentLocation}
                    endLocation={destinationLocation}
                  />
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={resetProcess}>
              Start Over
            </Button>

            {locationState === 'destination' && (
              <Button onClick={handleProceedToNavigation}>
                Get Directions
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}
