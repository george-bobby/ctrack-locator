'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Zap, ZapOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import CameraDiagnostics from '@/components/CameraDiagnostics';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export default function CameraCapture({ isOpen, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraStateRef = useRef<'idle' | 'starting' | 'running'>('idle');

  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  const { toast } = useToast();

  // Get available camera devices
  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      // Set default device (prefer back camera on mobile)
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

  // Start camera stream
  const startCamera = useCallback(async () => {
    // Prevent multiple simultaneous camera starts
    if (cameraStateRef.current === 'starting' || cameraStateRef.current === 'running') {
      console.log('Camera start already in progress or running, skipping...');
      return;
    }

    try {
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

        // Handle video play promise properly with additional checks
        try {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        } catch (error) {
          console.warn('Video play interrupted:', error);
          // Don't throw error, just log it as this is often due to rapid state changes
        }
      }

      setHasPermission(true);
      cameraStateRef.current = 'running';
      console.log('Camera started successfully');
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setHasPermission(false);
      cameraStateRef.current = 'idle';

      let errorMessage = 'Please allow camera access to take photos.';
      let errorTitle = 'Camera Access Error';

      // Provide specific error messages based on error type
      if (error.name === 'NotAllowedError') {
        errorTitle = 'Camera Permission Denied';
        errorMessage = 'Please allow camera access in your browser settings and try again.';
      } else if (error.name === 'NotFoundError') {
        errorTitle = 'No Camera Found';
        errorMessage = 'No camera device was found. Please connect a camera and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorTitle = 'Camera Not Supported';
        errorMessage = 'Your browser or device does not support camera access.';
      } else if (error.name === 'NotReadableError') {
        errorTitle = 'Camera In Use';
        errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.';
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
            // Stop any existing video first
            videoRef.current.pause();
            videoRef.current.srcObject = null;

            // Small delay to ensure previous stream is fully stopped
            await new Promise(resolve => setTimeout(resolve, 100));

            videoRef.current.srcObject = stream;

            // Handle video play promise properly with additional checks
            try {
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                await playPromise;
              }
            } catch (error) {
              console.warn('Video play interrupted:', error);
              // Don't throw error, just log it as this is often due to rapid state changes
            }
          }

          setHasPermission(true);
          setIsLoading(false);
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
    } finally {
      setIsLoading(false);
      setIsStartingCamera(false);
    }
  }, [facingMode, currentDeviceId, toast, isStartingCamera]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    cameraStateRef.current = 'idle';

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsStartingCamera(false);
    setHasPermission(null);
  }, []);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

    // Call the onCapture callback
    onCapture(imageDataUrl);

    // Close the camera
    handleClose();

    toast({
      title: 'Photo Captured!',
      description: 'Your photo has been captured successfully.',
    });
  }, [onCapture, toast]);

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

  // Initialize camera when modal opens
  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      const initCamera = async () => {
        try {
          await getDevices();
          if (isMounted && isOpen) {
            await startCamera();
          }
        } catch (error) {
          console.error('Failed to initialize camera:', error);
        }
      };

      initCamera();
    } else {
      stopCamera();
    }

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen]); // Remove function dependencies

  // Restart camera when device changes
  useEffect(() => {
    if (isOpen && currentDeviceId && cameraStateRef.current === 'idle') {
      // Add a small delay to prevent rapid restarts
      const timeoutId = setTimeout(() => {
        startCamera();
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [currentDeviceId, isOpen]); // Remove startCamera dependency

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto p-0 overflow-hidden sm:max-w-lg">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Take Photo
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {/* Video Preview */}
          <div className="relative aspect-[4/3] bg-black min-h-[300px] sm:min-h-[400px]">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Starting camera...</p>
                </div>
              </div>
            )}

            {/* Permission denied overlay */}
            {hasPermission === false && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <div className="text-white text-center p-4">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold mb-2">Camera Access Required</h3>
                  <p className="text-sm opacity-80 mb-4">
                    Please allow camera access in your browser settings to take photos.
                  </p>
                  <Button variant="outline" onClick={startCamera} className="text-black">
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4">
            {/* Switch Camera */}
            {devices.length > 1 && (
              <Button
                variant="outline"
                size="icon"
                onClick={switchCamera}
                className="bg-black/50 border-white/20 text-white hover:bg-black/70 touch-manipulation"
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
                  className="bg-black/50 border-white/20 text-white hover:bg-black/70 touch-manipulation"
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

            {/* Capture Button */}
            <Button
              size="lg"
              onClick={capturePhoto}
              disabled={!hasPermission || isLoading}
              className="bg-white text-black hover:bg-gray-100 rounded-full w-16 h-16 p-0 touch-manipulation shadow-lg"
            >
              <Camera className="h-6 w-6" />
            </Button>

            {/* Close Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleClose}
              className="bg-black/50 border-white/20 text-white hover:bg-black/70 touch-manipulation"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
