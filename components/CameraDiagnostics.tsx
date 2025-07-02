'use client';

import { useState, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'info';
  message: string;
}

export default function CameraDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    // Check 1: Browser Support
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      results.push({
        name: 'Browser Support',
        status: 'pass',
        message: 'Your browser supports camera access'
      });
    } else {
      results.push({
        name: 'Browser Support',
        status: 'fail',
        message: 'Your browser does not support camera access'
      });
    }

    // Check 2: Secure Context
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isHttps || isLocalhost) {
      results.push({
        name: 'Secure Context',
        status: 'pass',
        message: `Running on ${isHttps ? 'HTTPS' : 'localhost'} - camera access allowed`
      });
    } else {
      results.push({
        name: 'Secure Context',
        status: 'fail',
        message: 'Camera access requires HTTPS or localhost'
      });
    }

    // Check 3: Permissions API
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        results.push({
          name: 'Camera Permission',
          status: permission.state === 'granted' ? 'pass' : permission.state === 'denied' ? 'fail' : 'warning',
          message: `Permission state: ${permission.state}`
        });
      } catch (error) {
        results.push({
          name: 'Camera Permission',
          status: 'info',
          message: 'Permission status unknown - will be requested when camera is accessed'
        });
      }
    } else {
      results.push({
        name: 'Camera Permission',
        status: 'info',
        message: 'Permissions API not supported - permission will be requested when camera is accessed'
      });
    }

    // Check 4: Available Devices
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length > 0) {
        results.push({
          name: 'Camera Devices',
          status: 'pass',
          message: `Found ${videoDevices.length} camera device(s)`
        });
      } else {
        results.push({
          name: 'Camera Devices',
          status: 'fail',
          message: 'No camera devices found'
        });
      }
    } catch (error) {
      results.push({
        name: 'Camera Devices',
        status: 'warning',
        message: 'Could not enumerate devices - may require permission first'
      });
    }

    // Check 5: Test Camera Access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach(track => track.stop()); // Clean up
      
      results.push({
        name: 'Camera Access Test',
        status: 'pass',
        message: 'Successfully accessed camera'
      });
    } catch (error: any) {
      results.push({
        name: 'Camera Access Test',
        status: 'fail',
        message: `Camera access failed: ${error.name || 'Unknown error'}`
      });
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      pass: 'default',
      fail: 'destructive',
      warning: 'secondary',
      info: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Camera Diagnostics
        </CardTitle>
        <CardDescription>
          Run diagnostics to check if your camera is working properly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={isRunning} className="w-full">
          {isRunning ? 'Running Diagnostics...' : 'Run Camera Diagnostics'}
        </Button>

        {diagnostics.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Diagnostic Results:</h3>
            {diagnostics.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.name}</span>
                    {getStatusBadge(result.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {diagnostics.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Troubleshooting Tips:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• If permission is denied, check your browser settings and allow camera access</li>
              <li>• If no devices found, ensure your camera is connected and not in use by other apps</li>
              <li>• If running on HTTP, try accessing via HTTPS or localhost</li>
              <li>• Try refreshing the page and allowing camera permission when prompted</li>
              <li>• Check if your camera works in other applications</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
