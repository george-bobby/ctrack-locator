'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  onImageUpload: (imageDataUrl: string, detectedLocation: string) => void;
}

export default function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPEG, PNG, or WebP)',
        variant: 'destructive',
      });
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.onerror = () => {
      toast({
        title: 'Error',
        description: 'Failed to read the image file',
        variant: 'destructive',
      });
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const handleSubmit = async () => {
    if (!preview) {
      toast({
        title: 'No image selected',
        description: 'Please upload an image first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      // Convert base64 to blob
      const response = await fetch(preview);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, 'image.jpg');

      // Make sure the URL has a trailing slash before 'predict'
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const url = baseUrl.endsWith('/') ? `${baseUrl}predict` : `${baseUrl}/predict`;

      console.log('Sending request to:', url); // Debug log

      const res = await fetch(url, {
        method: 'POST',
        body: formData,
        mode: 'cors', // Explicitly set CORS mode
        headers: {
          // Don't set Content-Type header when sending FormData
          // It will be set automatically with the correct boundary
        },
      });


      if (!res.ok) {
        throw new Error('Failed to process image');
      }

      const data = await res.json();

      const predictedClass = data.predicted_class;
      const probabilities = data.probabilities;
      const confidence = probabilities[predictedClass];

      onImageUpload(preview, predictedClass);

      toast({
        title: 'Location Detected!',
        description: `Found: ${predictedClass} (${Math.round(confidence * 100)}% confidence)`,
      });
    } catch (err) {
      console.error('Error:', err);
      toast({
        title: 'Detection Failed',
        description:
          err instanceof Error
            ? err.message
            : 'Failed to detect location. Please try a different image or try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          'relative'
        )}
      >
        <input {...getInputProps()} />

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="mx-auto max-h-[300px] rounded-md object-contain"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={clearImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="rounded-full bg-muted p-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                Drag & drop an image here, or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supported formats: JPEG, PNG, WebP (max 5MB)
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            toast({
              title: 'Camera Feature',
              description:
                'Camera functionality will be available in the mobile app version.',
            });
          }}
        >
          <Camera className="mr-2 h-4 w-4" />
          Use Camera
        </Button>

        {preview && (
          <Button className="flex-1" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Detecting Location...' : 'Detect Location'}
            {!isLoading && <Upload className="ml-2 h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
