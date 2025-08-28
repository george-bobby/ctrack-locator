'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, Settings, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import CameraDiagnostics from '@/components/CameraDiagnostics';

interface PredictionResult {
  predicted_class: string;
  confidence: number;
  top_predictions: Record<string, number>;
  timestamp: number;
}

interface RealTimeCameraInlineProps {
  onLocationDetected: (location: string, confidence: number) => void;
}

export default function RealTimeCameraInline({
  onLocationDetected
}: RealTimeCameraInlineProps) {
  console.log('RealTimeCameraInline component rendered');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cameraStateRef = useRef<'idle' | 'starting' | 'running'>('idle');

  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null);
  const [nextCaptureIn, setNextCaptureIn] = useState<number>(3);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [initialCountdown, setInitialCountdown] = useState<number>(10);
  const [isInitialWait, setIsInitialWait] = useState(true);

  const { toast } = useToast();

  // Get available camera devices
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      if (videoDevices.length > 0 && !currentDeviceId) {
        // Prefer back camera if available
        const backCamera = videoDevices.find(device =>
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        setCurrentDeviceId(backCamera?.deviceId || videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  }, [currentDeviceId]);

  // Start camera stream
  const startCamera = useCallback(async () => {
    console.log('startCamera called, current state:', cameraStateRef.current);

    // Prevent multiple simultaneous camera starts
    if (cameraStateRef.current === 'starting' || cameraStateRef.current === 'running') {
      console.log('Camera start already in progress or running, skipping...');
      return;
    }

    try {
      console.log('Starting live detection camera...');
      cameraStateRef.current = 'starting';
      setIsStartingCamera(true);
      setIsLoading(true);

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          ...(currentDeviceId && { deviceId: { exact: currentDeviceId } })
        },
        audio: false
      };

      console.log('Requesting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        // Stop any existing video first
        videoRef.current.pause();
        videoRef.current.srcObject = null;

        // Small delay to ensure previous stream is fully stopped
        await new Promise(resolve => setTimeout(resolve, 100));

        videoRef.current.srcObject = stream;

        // Add event listeners for debugging
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded');
        };
        videoRef.current.oncanplay = () => {
          console.log('Video can play');
        };
        videoRef.current.onplaying = () => {
          console.log('Video is playing');
        };
        videoRef.current.onerror = (e) => {
          console.error('Video error:', e);
        };

        // Handle video play promise properly with additional checks
        try {
          console.log('Attempting to play video...');
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
            console.log('Video play promise resolved');
          }
        } catch (error) {
          console.warn('Video play interrupted:', error);
          // Don't throw error, just log it as this is often due to rapid state changes
        }
      }

      setHasPermission(true);
      cameraStateRef.current = 'running';

      // Start automatic capture after camera is ready
      setTimeout(() => {
        startAutomaticCapture();
      }, 1000);

    } catch (error) {
      console.error('Error starting camera:', error);
      setHasPermission(false);
      cameraStateRef.current = 'idle';

      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsStartingCamera(false);
    }
  }, [facingMode, currentDeviceId, toast]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    cameraStateRef.current = 'idle';

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (error) {
        console.warn('Error stopping video:', error);
      }
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsCapturing(false);
    setHasPermission(null);
    setIsStartingCamera(false);
  }, []);

  // Switch between front and back camera
  const switchCamera = useCallback(() => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex(device => device.deviceId === currentDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setCurrentDeviceId(devices[nextIndex].deviceId);
    }
  }, [devices, currentDeviceId]);

  // Capture frame and send for prediction
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    setIsProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const formData = new FormData();
        formData.append('image', blob, 'frame.jpg');

        try {
          // Use Next.js API route
          const response = await fetch('/api/predict', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to process frame');
          }

          const data = await response.json();

          // Check if there's an error in the response
          if (data.error) {
            console.warn('Prediction failed:', data.message || data.error);
            return;
          }

          // Check if we have a valid prediction
          if (!data.predicted_class) {
            console.warn('No location detected in this frame');
            return;
          }

          const prediction: PredictionResult = {
            predicted_class: data.predicted_class,
            confidence: data.probabilities ? data.probabilities[data.predicted_class] : (data.confidence || 0),
            top_predictions: data.probabilities || {},
            timestamp: Date.now()
          };

          setCurrentPrediction(prediction);

        } catch (error) {
          console.error('Error processing frame:', error);
        }
      }, 'image/jpeg', 0.8);

    } catch (error) {
      console.error('Error capturing frame:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  // Start automatic capture with initial delay
  const startAutomaticCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start with initial 10-second wait
    setIsInitialWait(true);
    setInitialCountdown(10);
    setIsCapturing(false);

    // Initial countdown timer
    const initialCountdownInterval = setInterval(() => {
      setInitialCountdown(prev => {
        if (prev <= 1) {
          // Initial wait is over, start regular capture cycle
          clearInterval(initialCountdownInterval);
          setIsInitialWait(false);
          setIsCapturing(true);
          setNextCaptureIn(3);

          // Start regular countdown timer
          const countdownInterval = setInterval(() => {
            setNextCaptureIn(prev => {
              if (prev <= 1) {
                captureFrame();
                return 3; // Reset to 3 seconds
              }
              return prev - 1;
            });
          }, 1000);

          intervalRef.current = countdownInterval;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    intervalRef.current = initialCountdownInterval;
  }, [captureFrame]);

  // Stop automatic capture
  const stopAutomaticCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsCapturing(false);
    setIsInitialWait(true);
    setInitialCountdown(10);
  }, []);

  // Handle location selection
  const handleSelectLocation = useCallback(() => {
    if (currentPrediction) {
      onLocationDetected(currentPrediction.predicted_class, currentPrediction.confidence);
      stopAutomaticCapture();
      stopCamera();
    }
  }, [currentPrediction, onLocationDetected, stopAutomaticCapture, stopCamera]);

  // Initialize camera when component mounts
  useEffect(() => {
    let isMounted = true;

    const initCamera = async () => {
      try {
        console.log('Initializing live detection camera...');
        await getDevices();
        if (isMounted && cameraStateRef.current === 'idle') {
          console.log('Starting live detection camera...');
          await startCamera();
        }
      } catch (error) {
        console.error('Failed to initialize live detection camera:', error);
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      console.log('Cleaning up live detection camera...');
      stopCamera();
    };
  }, [getDevices, startCamera, stopCamera]); // Add back dependencies but with proper guards

  // Restart camera when device changes
  useEffect(() => {
    console.log('Device change effect triggered:', { currentDeviceId, cameraState: cameraStateRef.current });

    if (currentDeviceId && cameraStateRef.current === 'idle') {
      console.log('Restarting camera for device change...');
      // Add a small delay to prevent rapid restarts
      const timeoutId = setTimeout(() => {
        startCamera();
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [currentDeviceId, startCamera]); // Add startCamera back

  console.log('RealTimeCameraInline render state:', {
    hasPermission,
    isLoading,
    isStartingCamera,
    cameraState: cameraStateRef.current,
    currentDeviceId
  });

  return (
    <div className="relative">
      {/* Camera View */}
      <div className="relative bg-black aspect-[4/3] overflow-hidden rounded-lg">
        {/* Always show video element for debugging */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ display: hasPermission && !isLoading ? 'block' : 'none' }}
        />

        {!(hasPermission && !isLoading) && (
          <div className="flex items-center justify-center h-full text-white">
            {isLoading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>Starting camera...</p>
              </div>
            ) : hasPermission === false ? (
              <div className="text-center p-4">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Camera access denied</p>
                <p className="text-xs opacity-75 mt-1">Please allow camera access and try again</p>
              </div>
            ) : (
              <div className="text-center">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Requesting camera access...</p>
              </div>
            )}
          </div>
        )}

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Results Overlay */}
        {currentPrediction && (
          <div className="absolute top-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-white">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-green-400" />
              <span className="font-medium">Detected Location</span>
            </div>
            <div className="text-lg font-bold text-green-400 mb-1">
              {currentPrediction.predicted_class}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Confidence:</span>
              <Badge variant="secondary" className="bg-green-400/20 text-green-400">
                {Math.round(currentPrediction.confidence * 100)}%
              </Badge>
            </div>
          </div>
        )}

        {/* Initial Wait Status */}
        {isInitialWait && (
          <div className="absolute bottom-4 left-4 right-4 bg-blue-900/90 backdrop-blur-sm rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Preparing camera...</span>
              </div>
              <span className="font-bold">{initialCountdown}s</span>
            </div>
            <Progress
              value={((10 - initialCountdown) / 10) * 100}
              className="h-2"
            />
            <div className="text-xs text-blue-200 mt-2">
              Detection will start automatically
            </div>
          </div>
        )}

        {/* Capture Status */}
        {isCapturing && !isInitialWait && (
          <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Next capture in</span>
              </div>
              <span className="font-bold">{nextCaptureIn}s</span>
            </div>
            <Progress
              value={((3 - nextCaptureIn) / 3) * 100}
              className="h-2"
            />
            {isProcessing && (
              <div className="flex items-center gap-2 mt-2 text-sm text-blue-400">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-400"></div>
                <span>Processing...</span>
              </div>
            )}
          </div>
        )}

        {/* Camera Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          {/* Switch Camera */}
          {devices.length > 1 && (
            <Button
              variant="outline"
              size="icon"
              onClick={switchCamera}
              className="bg-black/50 border-white/20 text-white hover:bg-black/70"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}

          {/* Camera Diagnostics */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                title="Camera Diagnostics"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Camera Diagnostics</DialogTitle>
              </DialogHeader>
              <CameraDiagnostics />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Action Buttons */}
      {currentPrediction && (
        <div className="mt-4">
          <div className="flex gap-2">
            <Button
              onClick={handleSelectLocation}
              className="flex-1"
              disabled={!currentPrediction}
            >
              Use This Location
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                stopAutomaticCapture();
                stopCamera();
              }}
            >
              Stop Detection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
