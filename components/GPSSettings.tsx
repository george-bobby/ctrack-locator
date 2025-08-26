'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Camera, Settings, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { checkGPSPermission, type GPSPermissionState } from '@/lib/gps-utils';

export interface PredictionSettings {
  gpsEnabled: boolean;
  aiEnabled: boolean;
  gpsWeight: number;
  aiWeight: number;
}

interface GPSSettingsProps {
  settings: PredictionSettings;
  onSettingsChange: (settings: PredictionSettings) => void;
  onRequestGPSPermission?: () => Promise<void>;
  className?: string;
}

export default function GPSSettings({ 
  settings, 
  onSettingsChange, 
  onRequestGPSPermission,
  className 
}: GPSSettingsProps) {
  const [gpsPermission, setGpsPermission] = useState<GPSPermissionState>({
    granted: false,
    denied: false,
    prompt: true
  });
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);

  // Check GPS permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const permission = await checkGPSPermission();
        setGpsPermission(permission);
      } catch (error) {
        console.error('Error checking GPS permission:', error);
        setGpsPermission({ granted: false, denied: true, prompt: false });
      } finally {
        setIsCheckingPermission(false);
      }
    };

    checkPermission();
  }, []);

  // Update weights when individual toggles change
  const handleGPSToggle = (enabled: boolean) => {
    const newSettings = { ...settings, gpsEnabled: enabled };
    
    // If GPS is disabled, give all weight to AI
    if (!enabled && settings.aiEnabled) {
      newSettings.gpsWeight = 0;
      newSettings.aiWeight = 100;
    }
    // If GPS is enabled and AI is disabled, give all weight to GPS
    else if (enabled && !settings.aiEnabled) {
      newSettings.gpsWeight = 100;
      newSettings.aiWeight = 0;
    }
    // If both are enabled, use default weights
    else if (enabled && settings.aiEnabled) {
      newSettings.gpsWeight = 40;
      newSettings.aiWeight = 60;
    }
    
    onSettingsChange(newSettings);
  };

  const handleAIToggle = (enabled: boolean) => {
    const newSettings = { ...settings, aiEnabled: enabled };
    
    // If AI is disabled, give all weight to GPS
    if (!enabled && settings.gpsEnabled) {
      newSettings.gpsWeight = 100;
      newSettings.aiWeight = 0;
    }
    // If AI is enabled and GPS is disabled, give all weight to AI
    else if (enabled && !settings.gpsEnabled) {
      newSettings.gpsWeight = 0;
      newSettings.aiWeight = 100;
    }
    // If both are enabled, use default weights
    else if (enabled && settings.gpsEnabled) {
      newSettings.gpsWeight = 40;
      newSettings.aiWeight = 60;
    }
    
    onSettingsChange(newSettings);
  };

  const handleWeightChange = (value: number[]) => {
    const gpsWeight = value[0];
    const aiWeight = 100 - gpsWeight;
    
    onSettingsChange({
      ...settings,
      gpsWeight,
      aiWeight
    });
  };

  const handleRequestPermission = async () => {
    if (onRequestGPSPermission) {
      try {
        await onRequestGPSPermission();
        // Recheck permission after request
        const permission = await checkGPSPermission();
        setGpsPermission(permission);
      } catch (error) {
        console.error('Error requesting GPS permission:', error);
      }
    }
  };

  const getGPSStatusIcon = () => {
    if (isCheckingPermission) return <Settings className="h-4 w-4 animate-spin" />;
    if (gpsPermission.granted) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (gpsPermission.denied) return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Info className="h-4 w-4 text-yellow-500" />;
  };

  const getGPSStatusText = () => {
    if (isCheckingPermission) return 'Checking GPS permission...';
    if (gpsPermission.granted) return 'GPS access granted';
    if (gpsPermission.denied) return 'GPS access denied';
    return 'GPS permission required';
  };

  const bothEnabled = settings.gpsEnabled && settings.aiEnabled;
  const neitherEnabled = !settings.gpsEnabled && !settings.aiEnabled;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Prediction Settings
        </CardTitle>
        <CardDescription>
          Configure how location predictions are made using GPS and AI
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* GPS Permission Status */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            {getGPSStatusIcon()}
            <span className="text-sm font-medium">{getGPSStatusText()}</span>
          </div>
          {(gpsPermission.prompt || gpsPermission.denied) && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRequestPermission}
              disabled={isCheckingPermission}
            >
              Enable GPS
            </Button>
          )}
        </div>

        {/* Prediction Methods */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Prediction Methods</h4>
          
          {/* GPS Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-blue-500" />
              <div>
                <Label htmlFor="gps-toggle" className="text-sm font-medium">
                  GPS Location
                </Label>
                <p className="text-xs text-muted-foreground">
                  Use device GPS for location detection
                </p>
              </div>
            </div>
            <Switch
              id="gps-toggle"
              checked={settings.gpsEnabled}
              onCheckedChange={handleGPSToggle}
              disabled={!gpsPermission.granted}
            />
          </div>

          {/* AI Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Camera className="h-4 w-4 text-green-500" />
              <div>
                <Label htmlFor="ai-toggle" className="text-sm font-medium">
                  AI Vision
                </Label>
                <p className="text-xs text-muted-foreground">
                  Use camera and AI for location detection
                </p>
              </div>
            </div>
            <Switch
              id="ai-toggle"
              checked={settings.aiEnabled}
              onCheckedChange={handleAIToggle}
            />
          </div>
        </div>

        {/* Weight Configuration */}
        {bothEnabled && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Prediction Weights</h4>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    GPS: {settings.gpsWeight}%
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    AI: {settings.aiWeight}%
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>More GPS</span>
                  <span>More AI</span>
                </div>
                <Slider
                  value={[settings.gpsWeight]}
                  onValueChange={handleWeightChange}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs">
                  <span className="text-blue-500">GPS {settings.gpsWeight}%</span>
                  <span className="text-green-500">AI {settings.aiWeight}%</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Warnings */}
        {neitherEnabled && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              At least one prediction method must be enabled.
            </AlertDescription>
          </Alert>
        )}

        {settings.gpsEnabled && !gpsPermission.granted && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              GPS is enabled but permission is not granted. Click "Enable GPS" to request access.
            </AlertDescription>
          </Alert>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• GPS provides accurate location but requires permission</p>
          <p>• AI analyzes camera images to identify locations</p>
          <p>• Combined predictions offer the best accuracy</p>
        </div>
      </CardContent>
    </Card>
  );
}
