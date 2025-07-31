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
import { Camera, Upload, Video, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// 🔁 Dynamically import components to avoid SSR issues
const RealTimeCameraCapture = dynamic(() => import('@/components/RealTimeCameraCapture'), { ssr: false });
const CameraCapture = dynamic(() => import('@/components/CameraCapture'), { ssr: false });
const ImageUploader = dynamic(() => import('@/components/ImageUploader'), { ssr: false });
const LocationSelector = dynamic(() => import('@/components/LocationSelector'), { ssr: false });
const NavigationMap = dynamic(() => import('@/components/NavigationMap'), { ssr: false });

type LocationState = 'detection' | 'destination' | 'navigation';
type DetectionMethod = 'camera' | 'upload' | 'live';

export default function LocationDetection() {
  const [locationState, setLocationState] = useState<LocationState>('detection');
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<string | null>(null);
  const [detectionMethod, setDetectionMethod] = useState<DetectionMethod>('upload');
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Modal states for different capture methods
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);

  const { toast } = useToast();

  // Handle image upload (from ImageUploader)
  const handleImageUpload = (imageDataUrl: string, detectedLocation: string) => {
    setUploadedImage(imageDataUrl);
    setCurrentLocation(detectedLocation);
    setDetectionConfidence(1.0); // ImageUploader doesn't provide confidence, so assume high
    setLocationState('destination');

    toast({
      title: 'Location Detected!',
      description: `Found: ${detectedLocation} via image upload`,
    });
  };

  // Send image to backend for prediction
  const predictImageLocation = async (imageDataUrl: string) => {
    try {
      // Convert base64 to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, 'image.jpg');

      // Make sure the URL has a trailing slash before 'predict'
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000';
      const url = baseUrl.endsWith('/') ? `${baseUrl}predict` : `${baseUrl}/predict`;

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      });

      if (!res.ok) {
        throw new Error('Failed to process image');
      }

      const data = await res.json();
      return {
        predicted_class: data.predicted_class,
        confidence: data.confidence || data.all_probabilities?.[data.predicted_class] || 0.5
      };
    } catch (error) {
      console.error('Prediction error:', error);
      toast({
        title: 'Prediction Failed',
        description: 'Failed to detect location. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Handle camera capture (from CameraCapture)
  const handleCameraCapture = async (imageDataUrl: string) => {
    setUploadedImage(imageDataUrl);
    setIsCameraOpen(false);

    // Send to backend for prediction
    const prediction = await predictImageLocation(imageDataUrl);
    if (prediction) {
      setCurrentLocation(prediction.predicted_class);
      setDetectionConfidence(prediction.confidence);
      setLocationState('destination');

      toast({
        title: 'Location Detected!',
        description: `Found: ${prediction.predicted_class} (${Math.round(prediction.confidence * 100)}% confidence) via camera`,
      });
    }
  };

  // Handle live detection (from RealTimeCameraCapture)
  const handleLiveLocationDetected = (location: string, confidence: number) => {
    setCurrentLocation(location);
    setDetectionConfidence(confidence);
    setLocationState('destination');
    setIsLiveCameraOpen(false);

    toast({
      title: 'Location Detected!',
      description: `Found: ${location} (${Math.round(confidence * 100)}% confidence) via live detection`,
    });
  };

  // Open different camera types
  const openCamera = () => {
    setIsCameraOpen(true);
  };

  const openLiveCamera = () => {
    setIsLiveCameraOpen(true);
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
    setDetectionConfidence(0);
    setUploadedImage(null);
    setIsCameraOpen(false);
    setIsLiveCameraOpen(false);
    setDetectionMethod('upload');
  };

  return (
    <section id="location-detection" className="py-16 container">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-8">
          Find Your Way Around Campus
        </h2>

        <Card className="w-full">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Campus Navigation</CardTitle>
              <Button variant="outline" onClick={resetProcess}>
                Start Over
              </Button>
            </div>
            <CardDescription>
              {locationState === 'detection' && "Choose your preferred method to detect your current location"}
              {locationState === 'destination' && "Select where you want to go"}
              {locationState === 'navigation' && "Follow the route to your destination"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {locationState === 'detection' && (
              <div className="space-y-6">
                <Tabs value={detectionMethod} onValueChange={(value) => setDetectionMethod(value as DetectionMethod)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Image
                    </TabsTrigger>
                    <TabsTrigger value="camera" className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Take Photo
                    </TabsTrigger>
                    <TabsTrigger value="live" className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Live Detection
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-4">
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-medium">Upload an Image</h3>
                      <p className="text-sm text-muted-foreground">
                        Select or drag an image of your surroundings to detect your location
                      </p>
                    </div>
                    <ImageUploader onImageUpload={handleImageUpload} />
                  </TabsContent>

                  <TabsContent value="camera" className="space-y-4">
                    <div className="text-center space-y-4">
                      <div>
                        <h3 className="text-lg font-medium">Take a Photo</h3>
                        <p className="text-sm text-muted-foreground">
                          Use your device camera to capture a photo for location detection
                        </p>
                      </div>
                      <Button
                        onClick={openCamera}
                        size="lg"
                        className="w-full max-w-md"
                      >
                        <Camera className="h-5 w-5 mr-2" />
                        Open Camera
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="live" className="space-y-4">
                    <div className="text-center space-y-4">
                      <div>
                        <h3 className="text-lg font-medium">Live Detection</h3>
                        <p className="text-sm text-muted-foreground">
                          Real-time location detection with automatic capture every 3 seconds
                        </p>
                      </div>
                      <Button
                        onClick={openLiveCamera}
                        size="lg"
                        className="w-full max-w-md"
                      >
                        <Video className="h-5 w-5 mr-2" />
                        Start Live Detection
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {locationState === 'destination' && (
              <div className="space-y-6">
                <div className="p-4 bg-muted rounded-lg mb-6">
                  <h3 className="font-medium mb-2">Your Current Location:</h3>
                  <p className="text-xl font-bold">{currentLocation}</p>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Detection Confidence: {Math.round(detectionConfidence * 100)}%
                  </div>
                  {uploadedImage && (
                    <img
                      src={uploadedImage}
                      alt="Captured location"
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

          <CardFooter className="flex justify-end">
            {locationState === 'destination' && (
              <Button onClick={handleProceedToNavigation}>
                Get Directions
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Camera Capture Modal */}
        <CameraCapture
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={handleCameraCapture}
        />

        {/* Real-time Camera Modal */}
        <RealTimeCameraCapture
          isOpen={isLiveCameraOpen}
          onClose={() => setIsLiveCameraOpen(false)}
          onLocationDetected={handleLiveLocationDetected}
        />
      </div>
    </section>
  );
}
