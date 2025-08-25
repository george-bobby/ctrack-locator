'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { MapPin, Camera, Zap } from 'lucide-react';
import { type HybridPredictionResult } from '@/lib/hybrid-prediction';

interface PredictionBreakdownProps {
  hybridResult: HybridPredictionResult;
  className?: string;
}

export default function PredictionBreakdown({ hybridResult, className }: PredictionBreakdownProps) {
  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'gps-only':
        return <MapPin className="h-4 w-4 text-blue-500" />;
      case 'ai-only':
        return <Camera className="h-4 w-4 text-green-500" />;
      case 'hybrid':
        return <Zap className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'gps-only':
        return 'bg-blue-500';
      case 'ai-only':
        return 'bg-green-500';
      case 'hybrid':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {getMethodIcon(hybridResult.method)}
          Prediction Analysis
          <Badge variant="outline" className="ml-auto">
            {hybridResult.method.replace('-', ' ').toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Final Result */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Final Location</span>
            <span className="text-lg font-bold">{hybridResult.finalLocation}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Overall Confidence</span>
            <span className="text-sm font-medium">{Math.round(hybridResult.finalConfidence * 100)}%</span>
          </div>
          <Progress 
            value={hybridResult.finalConfidence * 100} 
            className="mt-2 h-2"
          />
        </div>

        {/* Method-specific breakdown */}
        {hybridResult.method === 'hybrid' && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Contribution Breakdown</h4>
            
            {/* GPS Contribution */}
            {hybridResult.gpsData && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-blue-500" />
                    <span className="text-sm">GPS Location</span>
                  </div>
                  <span className="text-sm font-medium">{Math.round(hybridResult.gpsContribution)}%</span>
                </div>
                <Progress 
                  value={hybridResult.gpsContribution} 
                  className="h-1.5"
                />
                <div className="text-xs text-muted-foreground ml-5">
                  <p>Location: {hybridResult.gpsData.location}</p>
                  <p>Distance: {Math.round(hybridResult.gpsData.distance)}m</p>
                  <p>GPS Confidence: {Math.round(hybridResult.gpsData.confidence * 100)}%</p>
                </div>
              </div>
            )}

            {/* AI Contribution */}
            {hybridResult.aiData && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="h-3 w-3 text-green-500" />
                    <span className="text-sm">AI Vision</span>
                  </div>
                  <span className="text-sm font-medium">{Math.round(hybridResult.aiContribution)}%</span>
                </div>
                <Progress 
                  value={hybridResult.aiContribution} 
                  className="h-1.5"
                />
                <div className="text-xs text-muted-foreground ml-5">
                  <p>Predicted: {hybridResult.aiData.predicted_class}</p>
                  <p>AI Confidence: {Math.round(hybridResult.aiData.confidence * 100)}%</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Single method details */}
        {hybridResult.method === 'gps-only' && hybridResult.gpsData && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              GPS-Only Prediction
            </h4>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>Distance to location: {Math.round(hybridResult.gpsData.distance)}m</p>
              <p>Coordinates: {hybridResult.gpsData.coordinates.lat.toFixed(6)}, {hybridResult.gpsData.coordinates.lng.toFixed(6)}</p>
            </div>
          </div>
        )}

        {hybridResult.method === 'ai-only' && hybridResult.aiData && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Camera className="h-4 w-4 text-green-500" />
              AI-Only Prediction
            </h4>
            <div className="text-sm space-y-1">
              {/* Top 3 AI predictions */}
              {Object.entries(hybridResult.aiData.probabilities)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([location, confidence], index) => (
                  <div key={location} className="flex justify-between items-center">
                    <span className={index === 0 ? 'font-medium' : 'text-muted-foreground'}>
                      {index + 1}. {location}
                    </span>
                    <span className={index === 0 ? 'font-medium' : 'text-muted-foreground'}>
                      {Math.round(confidence * 100)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Score breakdown for hybrid */}
        {hybridResult.method === 'hybrid' && (
          <div className="pt-2 border-t">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Raw Scores</h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>GPS Score:</span>
                <span>{hybridResult.breakdown.gpsScore.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span>AI Score:</span>
                <span>{hybridResult.breakdown.aiScore.toFixed(3)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Combined:</span>
                <span>{hybridResult.breakdown.combinedScore.toFixed(3)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
