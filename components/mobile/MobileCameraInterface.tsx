'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, ArrowLeft, RotateCcw, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMobileCameraOptimizations, useNetworkStatus } from '@/hooks/use-mobile-optimizations';
import { useHapticFeedback } from '@/hooks/use-mobile-gestures';

interface MobileCameraInterfaceProps {
  destination: string;
  onLocationDetected: (location: string, confidence: number) => void;
  onBack: () => void;
}

interface PredictionResult {
  predicted_class: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export default function MobileCameraInterface({
  destination,
  onLocationDetected,
  onBack,
}: MobileCameraInterfaceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');

  const { toast } = useToast();
  const { getImageQuality, getCaptureInterval } = useMobileCameraOptimizations();
  const { isSlowConnection } = useNetworkStatus();
  const { lightImpact, success, warning } = useHapticFeedback();

  // Initialize camera on component mount
  useEffect(() => {
    getDevices();
    return () => {
      stopCamera();
    };
  }, []);

  // Start auto-capture when streaming begins
  useEffect(() => {
    if (isStreaming && autoCapture) {
      startAutoCapture();
    } else {
      stopAutoCapture();
    }
    return () => stopAutoCapture();
  }, [isStreaming, autoCapture]);

  // Update capture interval based on network conditions
  useEffect(() => {
    if (autoCapture && isStreaming) {
      stopAutoCapture();
      startAutoCapture();
    }
  }, [isSlowConnection]);

  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      // Prefer back camera on mobile
      const backCamera = videoDevices.find(device =>
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );

      if (backCamera) {
        setCurrentDeviceId(backCamera.deviceId);
      } else if (videoDevices.length > 0) {
        setCurrentDeviceId(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const facingMode = currentDeviceId ? undefined : 'environment';

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: facingMode,
          deviceId: currentDeviceId ? { exact: currentDeviceId } : undefined,
        }
      };

      console.log('Starting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('Video stream set, attempting to play...');

        // Ensure video plays
        try {
          await videoRef.current.play();
          setIsStreaming(true);
          console.log('Camera started successfully');
        } catch (playError) {
          console.error('Error playing video:', playError);
          // Try to play again after a short delay
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.play().catch(console.error);
            }
          }, 100);
          setIsStreaming(true);
        }
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions and try again.',
        variant: 'destructive',
      });
    }
  }, [currentDeviceId, toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    stopAutoCapture();
  }, []);

  // Auto-start camera when device is selected
  useEffect(() => {
    if (currentDeviceId && !isStreaming) {
      startCamera();
    }
  }, [currentDeviceId, isStreaming, startCamera]);

  const startAutoCapture = useCallback(() => {
    if (intervalRef.current) return;

    const interval = getCaptureInterval();
    const countdownStart = Math.floor(interval / 1000);
    let count = countdownStart;
    setCountdown(count);

    intervalRef.current = setInterval(() => {
      count--;
      setCountdown(count);

      if (count <= 0) {
        captureAndPredict();
        count = countdownStart; // Reset countdown
      }
    }, 1000);
  }, [getCaptureInterval]);

  const stopAutoCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCountdown(5);
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL('image/jpeg', getImageQuality());
  }, []);

  const predictLocation = useCallback(async (imageDataUrl: string): Promise<PredictionResult | null> => {
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');

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
        confidence: data.probabilities[data.predicted_class],
        probabilities: data.probabilities,
      };
    } catch (error) {
      console.error('Prediction error:', error);
      return null;
    }
  }, []);

  const captureAndPredict = useCallback(async () => {
    if (isProcessing) return;

    const imageDataUrl = captureFrame();
    if (!imageDataUrl) return;

    setIsProcessing(true);

    const prediction = await predictLocation(imageDataUrl);
    if (prediction) {
      setCurrentPrediction(prediction);

      // Auto-proceed if confidence is high enough
      if (prediction.confidence > 0.7) {
        setTimeout(() => {
          onLocationDetected(prediction.predicted_class, prediction.confidence);
        }, 1500);
      }
    }

    setIsProcessing(false);
  }, [isProcessing, captureFrame, predictLocation, onLocationDetected]);

  const handleManualCapture = () => {
    stopAutoCapture();
    setAutoCapture(false);
    lightImpact(); // Haptic feedback for button press
    captureAndPredict();
  };

  const handleUseThisLocation = () => {
    if (currentPrediction) {
      success(); // Haptic feedback for successful selection
      onLocationDetected(currentPrediction.predicted_class, currentPrediction.confidence);
    }
  };

  const switchCamera = () => {
    const currentIndex = devices.findIndex(device => device.deviceId === currentDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setCurrentDeviceId(devices[nextIndex].deviceId);

    if (isStreaming) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="text-center">
          <h2 className="font-semibold text-white" style={{ textShadow: "2px 2px 6px rgba(0, 0, 0, 0.8)" }}>Detect Location</h2>
          <p className="text-sm text-white/90" style={{ textShadow: "2px 2px 6px rgba(0, 0, 0, 0.8)" }}>Going to: {destination}</p>
        </div>
        <div className="w-16"></div>
      </div>

      {/* Camera View */}
      <Card className="shadow-xl bg-white/95 backdrop-blur-sm border border-white/20 overflow-hidden">
        <CardContent className="p-0">
          <div className="relative bg-black aspect-[4/3] flex items-center justify-center">
            {!isStreaming ? (
              <div className="text-center text-white">
                <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <Button
                  onClick={startCamera}
                  className="bg-primary hover:bg-primary/90"
                >
                  Start Camera
                </Button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      videoRef.current.play().catch(console.error);
                    }
                  }}
                />

                {/* Auto-capture countdown overlay */}
                {autoCapture && countdown <= 3 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="text-6xl font-bold text-white animate-pulse">
                      {countdown}
                    </div>
                  </div>
                )}

                {/* Processing overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p>Analyzing location...</p>
                    </div>
                  </div>
                )}

                {/* Camera controls overlay */}
                <div className="absolute top-4 right-4 flex space-x-2">
                  {devices.length > 1 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={switchCamera}
                      className="bg-black/50 text-white border-0 hover:bg-black/70"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Auto-capture indicator */}
                {autoCapture && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-green-600 text-white flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Auto: {countdown}s
                    </Badge>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      {isStreaming && (
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Button
              onClick={handleManualCapture}
              disabled={isProcessing}
              className="flex-1 h-12 bg-primary hover:bg-primary/90 mobile-touch-target mobile-button"
            >
              <Camera className="w-5 h-5 mr-2" />
              Capture Now
            </Button>
            <Button
              onClick={() => setAutoCapture(!autoCapture)}
              variant={autoCapture ? "default" : "outline"}
              className="h-12 px-6 mobile-touch-target mobile-button bg-secondary hover:bg-secondary/90"
            >
              <Zap className="w-5 h-5 mr-2" />
              Auto
            </Button>
          </div>

          {/* Current Prediction */}
          {currentPrediction && (
            <Card className="shadow-lg bg-white/95 backdrop-blur-sm border border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Location Detected</h3>
                  <Badge className="bg-primary text-white">
                    {Math.round(currentPrediction.confidence * 100)}%
                  </Badge>
                </div>
                <p className="text-gray-700 mb-4 font-medium">{currentPrediction.predicted_class}</p>
                <Button
                  onClick={handleUseThisLocation}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Use This Location
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
