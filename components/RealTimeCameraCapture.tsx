'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Settings, MapPin, Clock } from 'lucide-react';
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

interface RealTimeCameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationDetected: (location: string, confidence: number) => void;
}

export default function RealTimeCameraCapture({
  isOpen,
  onClose,
  onLocationDetected
}: RealTimeCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null);
  const [nextCaptureIn, setNextCaptureIn] = useState<number>(3);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setHasPermission(null);
    setIsCapturing(false);
    setNextCaptureIn(3);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
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
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setHasPermission(true);
      setIsLoading(false);

      // Start the automatic capture process
      startAutomaticCapture();

    } catch (error: any) {
      console.error('Camera access error:', error);
      setIsLoading(false);
      setHasPermission(false);

      let errorTitle = 'Camera Access Error';
      let errorMessage = 'Unable to access camera. Please check permissions.';

      if (error.name === 'NotAllowedError') {
        errorTitle = 'Camera Permission Denied';
        errorMessage = 'Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorTitle = 'No Camera Found';
        errorMessage = 'No camera device was found on this device.';
      } else if (error.name === 'OverconstrainedError') {
        errorTitle = 'Camera Constraints Error';
        errorMessage = 'Camera settings are not supported. Trying with basic settings...';

        // Try with basic constraints
        try {
          const basicConstraints: MediaStreamConstraints = {
            video: true,
            audio: false
          };
          console.log('Retrying with basic constraints:', basicConstraints);
          const stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
          streamRef.current = stream;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }

          setHasPermission(true);
          setIsLoading(false);
          startAutomaticCapture();
          return;
        } catch (basicError) {
          console.error('Basic camera access also failed:', basicError);
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [facingMode, currentDeviceId, toast]);

  // Capture frame from video stream
  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return null;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Send frame to backend for prediction
  const predictLocation = useCallback(async (imageDataUrl: string): Promise<PredictionResult | null> => {
    try {
      setIsProcessing(true);

      // Convert base64 to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');

      // Make sure the URL has a trailing slash before 'predict'
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
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
        confidence: data.confidence,
        top_predictions: data.top_predictions,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Prediction error:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Start automatic capture process
  const startAutomaticCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsCapturing(true);
    setNextCaptureIn(3);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setNextCaptureIn(prev => {
        if (prev <= 1) {
          // Time to capture
          (async () => {
            const frame = await captureFrame();
            if (frame) {
              const prediction = await predictLocation(frame);
              if (prediction) {
                setCurrentPrediction(prediction);
              }
            }
          })();
          return 3; // Reset to 3 seconds
        }
        return prev - 1;
      });
    }, 1000);

    intervalRef.current = countdownInterval;
  }, [captureFrame, predictLocation]);

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    if (devices.length > 1) {
      const currentIndex = devices.findIndex(device => device.deviceId === currentDeviceId);
      const nextIndex = (currentIndex + 1) % devices.length;
      setCurrentDeviceId(devices[nextIndex].deviceId);
    } else {
      // Fallback to facing mode toggle
      setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    }
  }, [devices, currentDeviceId]);

  // Handle modal close
  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  // Handle location selection
  const handleSelectLocation = useCallback(() => {
    if (currentPrediction) {
      onLocationDetected(currentPrediction.predicted_class, currentPrediction.confidence);
      handleClose();
    }
  }, [currentPrediction, onLocationDetected, handleClose]);

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      getDevices().then(() => {
        startCamera();
      });
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, getDevices, startCamera, stopCamera]);

  // Restart camera when device changes
  useEffect(() => {
    if (isOpen && currentDeviceId) {
      startCamera();
    }
  }, [currentDeviceId, isOpen, startCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto p-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Real-time Location Detection
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {/* Camera View */}
          <div className="relative bg-black aspect-[4/3] overflow-hidden">
            {hasPermission && !isLoading ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
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

            {/* Capture Status */}
            {isCapturing && (
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

              {/* Close Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleClose}
                className="bg-black/50 border-white/20 text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          {currentPrediction && (
            <div className="p-4 border-t bg-background">
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
                  onClick={handleClose}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
