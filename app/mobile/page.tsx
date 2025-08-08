'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useToast } from '@/hooks/use-toast';
import { campusLocations } from '@/lib/campus-data';
import {
  getCurrentGPSLocation,
  adaptiveFuseAIAndGPS,
  GPSLocation,
  LocationData as GPSLocationData
} from '@/lib/mobile-gps';
import { useNetworkStatus } from '@/hooks/use-mobile-optimizations';
import { useHapticFeedback, useMobileViewport } from '@/hooks/use-mobile-gestures';
import { MapPin, Wifi, WifiOff, Signal } from 'lucide-react';
import Link from 'next/link';

// Dynamically import mobile components to avoid SSR issues
const MobileDestinationSelector = dynamic(() => import('@/components/mobile/MobileDestinationSelector'), { ssr: false });
const MobileCameraInterface = dynamic(() => import('@/components/mobile/MobileCameraInterface'), { ssr: false });
const MobileNavigationMap = dynamic(() => import('@/components/mobile/MobileNavigationMap'), { ssr: false });

type MobileAppState = 'destination' | 'camera' | 'detecting' | 'navigation';

interface LocationData {
  name: string;
  confidence: number;
  lat?: number;
  lng?: number;
}

export default function MobilePage() {
  const [appState, setAppState] = useState<MobileAppState>('destination');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [detectedSource, setDetectedSource] = useState<LocationData | null>(null);
  const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isOnline, showNetworkIndicator, isSlowConnection } = useNetworkStatus();
  const { success, warning } = useHapticFeedback();
  const { preventZoom } = useMobileViewport();

  // Define getCurrentLocation with useCallback to prevent unnecessary re-renders
  const getCurrentLocation = useCallback(async () => {
    try {
      const location = await getCurrentGPSLocation();
      setGpsLocation(location);
      toast({
        title: 'GPS Active',
        description: `Location accuracy: ${Math.round(location.accuracy)}m`,
      });
    } catch (error) {
      console.error('GPS Error:', error);
      toast({
        title: 'GPS Error',
        description: error instanceof Error ? error.message : 'Unable to get your current location.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Get GPS location on component mount and setup mobile optimizations
  useEffect(() => {
    getCurrentLocation();
    preventZoom(); // Prevent accidental zoom on mobile
  }, [getCurrentLocation, preventZoom]);

  const handleDestinationSelect = (destination: string) => {
    setSelectedDestination(destination);
    setAppState('camera');
    success(); // Haptic feedback for successful selection
  };

  const handleLocationDetected = async (aiLocation: string, confidence: number) => {
    setIsLoading(true);
    setAppState('detecting');

    try {
      // Use adaptive fusion logic: 60% AI + 40% GPS (with dynamic adjustment)
      const fusionResult = await adaptiveFuseAIAndGPS(aiLocation, confidence, gpsLocation);

      setDetectedSource(fusionResult.location);
      setAppState('navigation');

      toast({
        title: 'Location Detected!',
        description: `Source: ${fusionResult.location.name} (${Math.round(fusionResult.location.confidence * 100)}% confidence) - ${fusionResult.location.source.toUpperCase()}`,
      });
      success(); // Haptic feedback for successful detection
    } catch (error) {
      console.error('Location fusion error:', error);
      toast({
        title: 'Detection Failed',
        description: 'Failed to determine your location. Please try again.',
        variant: 'destructive',
      });
      warning(); // Haptic feedback for error
      setAppState('camera');
    } finally {
      setIsLoading(false);
    }
  };



  const handleBackToDestination = () => {
    setAppState('destination');
    setDetectedSource(null);
    setSelectedDestination('');
  };

  const handleRetakePhoto = () => {
    setAppState('camera');
    setDetectedSource(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/5 flex flex-col mobile-app-container mobile-no-pull-refresh mobile-no-select relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/christ-image.jpg')`,
          filter: "brightness(0.3)"
        }}
      />

      {/* Network Status Indicator */}
      {showNetworkIndicator && (
        <div className={`fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center py-2 text-sm transition-transform duration-300 ${showNetworkIndicator ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="flex items-center justify-center space-x-2">
            {!isOnline ? (
              <>
                <WifiOff className="h-4 w-4" />
                <span>No internet connection</span>
              </>
            ) : isSlowConnection ? (
              <>
                <Signal className="h-4 w-4" />
                <span>Slow connection detected</span>
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4" />
                <span>Connection restored</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <header className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/10 p-4 mobile-safe-area">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center text-white text-xl font-bold">
            <MapPin className="h-6 w-6 text-white mr-2" />
            <span style={{ textShadow: "2px 2px 6px rgba(0, 0, 0, 0.8)" }}>C-TRACK Mobile</span>
          </Link>
          <div className="flex items-center space-x-2">
            {gpsLocation && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
            )}
            <span className="text-sm text-white/90" style={{ textShadow: "2px 2px 6px rgba(0, 0, 0, 0.8)" }}>
              {gpsLocation ? 'GPS Active' : 'GPS Inactive'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 relative z-10">
        {appState === 'destination' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Choose Your Destination</h2>
              <p className="text-gray-600 text-center mb-6">Select where you want to go on campus</p>
            </div>
            <MobileDestinationSelector
              onDestinationSelect={handleDestinationSelect}
              destinations={campusLocations.map(loc => loc.name)}
            />
          </div>
        )}

        {appState === 'camera' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Capture Your Location</h2>
              <p className="text-gray-600 text-center mb-2">Take a photo of your surroundings</p>
              <p className="text-sm text-gray-500 text-center">Destination: <span className="font-semibold text-primary">{selectedDestination}</span></p>
            </div>
            <MobileCameraInterface
              destination={selectedDestination}
              onLocationDetected={handleLocationDetected}
              onBack={handleBackToDestination}
            />
          </div>
        )}

        {appState === 'detecting' && (
          <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 p-8 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-6"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Detecting Location</h2>
              <p className="text-gray-600 mb-2">
                Analyzing image and GPS data to determine your location...
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <span>AI Analysis</span>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span>GPS Fusion</span>
              </div>
            </div>
          </div>
        )}

        {appState === 'navigation' && detectedSource && (
          <div className="max-w-md mx-auto">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/20 p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Navigation</h2>
              <p className="text-gray-600 text-center mb-2">
                From <span className="font-semibold text-primary">{detectedSource.name}</span> to <span className="font-semibold text-primary">{selectedDestination}</span>
              </p>
              <p className="text-sm text-gray-500 text-center">
                Confidence: {Math.round(detectedSource.confidence * 100)}%
              </p>
            </div>
            <MobileNavigationMap
              sourceLocation={detectedSource.name}
              destinationLocation={selectedDestination}
              onRetakePhoto={handleRetakePhoto}
              onBackToDestination={handleBackToDestination}
            />
          </div>
        )}
      </main>
    </div>
  );
}
