'use client';

import { useState, useEffect } from 'react';
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
import { Upload, Video, ArrowLeft, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getGPSService, requestGPSPermission, type GPSLocationResult } from '@/lib/gps-service';
import { combineGPSAndAIPredictions, type HybridPredictionResult, type AIPrediction } from '@/lib/hybrid-prediction';
import { getBestGPSMatch } from '@/lib/gps-utils';

// 🔁 Dynamically import components to avoid SSR issues
const RealTimeCameraInline = dynamic(() => import('@/components/RealTimeCameraInline'), { ssr: false });
const CameraCapture = dynamic(() => import('@/components/CameraCapture'), { ssr: false });
const ImageUploader = dynamic(() => import('@/components/ImageUploader'), { ssr: false });
const LocationSelector = dynamic(() => import('@/components/LocationSelector'), { ssr: false });
const NavigationMap = dynamic(() => import('@/components/NavigationMap'), { ssr: false });
const GPSSettings = dynamic(() => import('@/components/GPSSettings'), { ssr: false });
const PredictionBreakdown = dynamic(() => import('@/components/PredictionBreakdown'), { ssr: false });

type LocationState = 'detection' | 'destination' | 'navigation';
type DetectionMethod = 'upload' | 'live';

interface PredictionSettings {
  gpsEnabled: boolean;
  aiEnabled: boolean;
  gpsWeight: number;
  aiWeight: number;
}

export default function LocationDetection() {
  const [locationState, setLocationState] = useState<LocationState>('detection');
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<string | null>(null);
  const [detectionMethod, setDetectionMethod] = useState<DetectionMethod>('upload');
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Modal state for camera capture
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // GPS and prediction settings
  const [showSettings, setShowSettings] = useState(false);
  const [predictionSettings, setPredictionSettings] = useState<PredictionSettings>({
    gpsEnabled: false,
    aiEnabled: true,
    gpsWeight: 40,
    aiWeight: 60
  });
  const [currentGPSLocation, setCurrentGPSLocation] = useState<GPSLocationResult | null>(null);
  const [hybridResult, setHybridResult] = useState<HybridPredictionResult | null>(null);

  const { toast } = useToast();
  const gpsService = getGPSService();

  // GPS location monitoring
  useEffect(() => {
    // Add a small delay to prevent conflicts with camera initialization
    const timeoutId = setTimeout(() => {
      if (predictionSettings.gpsEnabled) {
        gpsService.updateOptions({
          onLocationUpdate: (result) => {
            setCurrentGPSLocation(result);
          },
          onError: (error) => {
            console.error('GPS error:', error);
            toast({
              title: 'GPS Error',
              description: error.message,
              variant: 'destructive',
            });
          }
        });

        gpsService.startWatching();
      } else {
        gpsService.stopWatching();
        setCurrentGPSLocation(null);
      }
    }, 100); // Small delay to prevent race conditions

    return () => {
      clearTimeout(timeoutId);
      gpsService.stopWatching();
    };
  }, [predictionSettings.gpsEnabled, gpsService, toast]);

  // Handle image upload (from ImageUploader)
  const handleImageUpload = async (imageDataUrl: string, detectedLocation: string) => {
    setUploadedImage(imageDataUrl);

    // If hybrid prediction is enabled, combine with GPS
    if (predictionSettings.gpsEnabled && currentGPSLocation?.bestMatch) {
      const aiPrediction: AIPrediction = {
        predicted_class: detectedLocation,
        confidence: 1.0,
        probabilities: { [detectedLocation]: 1.0 }
      };

      const hybrid = combineGPSAndAIPredictions(
        currentGPSLocation.bestMatch,
        aiPrediction,
        { gpsWeight: predictionSettings.gpsWeight, aiWeight: predictionSettings.aiWeight }
      );

      setHybridResult(hybrid);
      setCurrentLocation(hybrid.finalLocation);
      setDetectionConfidence(hybrid.finalConfidence);

      toast({
        title: 'Location Detected!',
        description: `Found: ${hybrid.finalLocation} (${Math.round(hybrid.finalConfidence * 100)}% confidence) via hybrid prediction`,
      });
    } else {
      setCurrentLocation(detectedLocation);
      setDetectionConfidence(1.0);

      toast({
        title: 'Location Detected!',
        description: `Found: ${detectedLocation} via image upload`,
      });
    }

    setLocationState('destination');
  };

  // Send image to backend for prediction with optional GPS data
  const predictImageLocation = async (imageDataUrl: string) => {
    try {
      // Convert base64 to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, 'image.jpg');

      // Add GPS data if available and enabled
      if (predictionSettings.gpsEnabled && currentGPSLocation?.coordinates) {
        formData.append('gps_lat', currentGPSLocation.coordinates.latitude.toString());
        formData.append('gps_lng', currentGPSLocation.coordinates.longitude.toString());
        formData.append('gps_weight', predictionSettings.gpsWeight.toString());
        formData.append('ai_weight', predictionSettings.aiWeight.toString());
      }

      // Use Next.js API route
      const res = await fetch('/api/predict', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Failed to process image');
      }

      const data = await res.json();

      // Check if there's an error in the response
      if (data.error) {
        throw new Error(data.message || data.error);
      }

      // Check if we have a valid prediction
      if (!data.predicted_class) {
        throw new Error('No location could be detected from this image');
      }

      // Handle hybrid prediction response
      if (data.hybrid_prediction) {
        setHybridResult(data.hybrid_prediction);
        return {
          predicted_class: data.hybrid_prediction.final_location,
          confidence: data.hybrid_prediction.final_confidence,
          method: data.method,
          gpsData: data.gps_data,
          aiData: data.ai_data
        };
      }

      return {
        predicted_class: data.predicted_class,
        confidence: data.confidence || data.probabilities?.[data.predicted_class] || 0.5,
        method: data.method || 'ai-only'
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

    toast({
      title: 'Location Detected!',
      description: `Found: ${location} (${Math.round(confidence * 100)}% confidence) via live detection`,
    });
  };

  // Open camera for photo capture
  const openCamera = () => {
    setIsCameraOpen(true);
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

  // Handle GPS permission request
  const handleGPSPermissionRequest = async () => {
    try {
      const granted = await requestGPSPermission();
      if (granted) {
        setPredictionSettings(prev => ({ ...prev, gpsEnabled: true }));
        toast({
          title: 'GPS Enabled',
          description: 'GPS location access granted successfully',
        });
      } else {
        toast({
          title: 'GPS Permission Denied',
          description: 'GPS access is required for location-based predictions',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'GPS Error',
        description: 'Failed to request GPS permission',
        variant: 'destructive',
      });
    }
  };

  // Handle settings change
  const handleSettingsChange = (newSettings: PredictionSettings) => {
    setPredictionSettings(newSettings);

    // Validate that at least one method is enabled
    if (!newSettings.gpsEnabled && !newSettings.aiEnabled) {
      setPredictionSettings(prev => ({ ...prev, aiEnabled: true }));
      toast({
        title: 'Invalid Settings',
        description: 'At least one prediction method must be enabled',
        variant: 'destructive',
      });
    }
  };

  const resetProcess = () => {
    setLocationState('detection');
    setCurrentLocation(null);
    setDestinationLocation(null);
    setDetectionConfidence(0);
    setUploadedImage(null);
    setIsCameraOpen(false);
    setDetectionMethod('upload');
    setHybridResult(null);
    setShowSettings(false);
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button variant="outline" onClick={resetProcess}>
                  Start Over
                </Button>
              </div>
            </div>
            <CardDescription>
              {locationState === 'detection' && "Choose your preferred method to detect your current location"}
              {locationState === 'destination' && "Select where you want to go"}
              {locationState === 'navigation' && "Follow the route to your destination"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Settings Panel */}
            {showSettings && (
              <div className="mb-6">
                <GPSSettings
                  settings={predictionSettings}
                  onSettingsChange={handleSettingsChange}
                  onRequestGPSPermission={handleGPSPermissionRequest}
                />
              </div>
            )}

            {/* GPS Status Display */}
            {predictionSettings.gpsEnabled && currentGPSLocation && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">GPS Status</h4>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <p>Coordinates: {currentGPSLocation.coordinates.latitude.toFixed(6)}, {currentGPSLocation.coordinates.longitude.toFixed(6)}</p>
                  {currentGPSLocation.bestMatch && (
                    <p>Nearest: {currentGPSLocation.bestMatch.name} ({Math.round(currentGPSLocation.bestMatch.distance)}m away)</p>
                  )}
                  <p>On Campus: {currentGPSLocation.isOnCampus ? 'Yes' : 'No'}</p>
                </div>
              </div>
            )}

            {locationState === 'detection' && (
              <div className="space-y-6">
                <Tabs value={detectionMethod} onValueChange={(value) => setDetectionMethod(value as DetectionMethod)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload Image
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
                        Select or drag an image of your surroundings, or take a photo to detect your location
                      </p>
                    </div>
                    <ImageUploader onImageUpload={handleImageUpload} />
                  </TabsContent>

                  <TabsContent value="live" className="space-y-4">
                    <div className="text-center space-y-2 mb-4">
                      <h3 className="text-lg font-medium">Live Detection</h3>
                      <p className="text-sm text-muted-foreground">
                        Real-time location detection using your camera feed
                      </p>
                    </div>
                    <RealTimeCameraInline
                      onLocationDetected={handleLiveLocationDetected}
                    />
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

                  {/* Hybrid Prediction Details */}
                  {hybridResult && (
                    <div className="mt-4 p-3 bg-background rounded border">
                      <h4 className="text-sm font-medium mb-2">Prediction Details</h4>
                      <div className="text-xs space-y-1">
                        <p>Method: {hybridResult.method}</p>
                        {hybridResult.method === 'hybrid' && (
                          <>
                            <p>GPS Contribution: {Math.round(hybridResult.gpsContribution)}%</p>
                            <p>AI Contribution: {Math.round(hybridResult.aiContribution)}%</p>
                          </>
                        )}
                        {hybridResult.gpsData && (
                          <p>GPS Distance: {Math.round(hybridResult.gpsData.distance)}m</p>
                        )}
                      </div>
                    </div>
                  )}

                  {uploadedImage && (
                    <img
                      src={uploadedImage}
                      alt="Captured location"
                      className="mt-4 max-h-[200px] rounded-md object-contain"
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <LocationSelector
                    locations={campusLocations.map(loc => loc.name)}
                    currentLocation={currentLocation || ''}
                    onSelect={handleDestinationSelect}
                    selectedLocation={destinationLocation}
                  />

                  {/* Prediction Analysis */}
                  {hybridResult && (
                    <PredictionBreakdown hybridResult={hybridResult} />
                  )}
                </div>
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
      </div>
    </section>
  );
}
