'use client';

import { 
  getCurrentGPSPosition, 
  watchGPSPosition, 
  clearGPSWatch,
  getBestGPSMatch,
  isWithinCampusBounds,
  type GPSCoordinates,
  type LocationMatch 
} from './gps-utils';

export interface GPSLocationResult {
  coordinates: GPSCoordinates;
  bestMatch: LocationMatch | null;
  isOnCampus: boolean;
  error?: string;
}

export interface GPSServiceOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  onLocationUpdate?: (result: GPSLocationResult) => void;
  onError?: (error: Error) => void;
}

export class GPSLocationService {
  private watchId: number | null = null;
  private isWatching = false;
  private lastKnownLocation: GPSLocationResult | null = null;
  private options: GPSServiceOptions;

  constructor(options: GPSServiceOptions = {}) {
    this.options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
      ...options
    };
  }

  /**
   * Get current GPS location once
   */
  async getCurrentLocation(): Promise<GPSLocationResult> {
    try {
      const coordinates = await getCurrentGPSPosition({
        enableHighAccuracy: this.options.enableHighAccuracy,
        timeout: this.options.timeout,
        maximumAge: this.options.maximumAge
      });

      const result = this.processLocationData(coordinates);
      this.lastKnownLocation = result;
      
      return result;
    } catch (error) {
      const errorResult: GPSLocationResult = {
        coordinates: { latitude: 0, longitude: 0 },
        bestMatch: null,
        isOnCampus: false,
        error: error instanceof Error ? error.message : 'Unknown GPS error'
      };
      
      this.options.onError?.(error instanceof Error ? error : new Error('Unknown GPS error'));
      return errorResult;
    }
  }

  /**
   * Start watching GPS location for continuous updates
   */
  startWatching(): boolean {
    if (this.isWatching) {
      console.warn('GPS watching is already active');
      return true;
    }

    try {
      this.watchId = watchGPSPosition(
        (coordinates) => {
          const result = this.processLocationData(coordinates);
          this.lastKnownLocation = result;
          this.options.onLocationUpdate?.(result);
        },
        (error) => {
          this.options.onError?.(error);
        },
        {
          enableHighAccuracy: this.options.enableHighAccuracy,
          timeout: this.options.timeout,
          maximumAge: this.options.maximumAge
        }
      );

      if (this.watchId !== null) {
        this.isWatching = true;
        return true;
      }
      
      return false;
    } catch (error) {
      this.options.onError?.(error instanceof Error ? error : new Error('Failed to start GPS watching'));
      return false;
    }
  }

  /**
   * Stop watching GPS location
   */
  stopWatching(): void {
    if (this.watchId !== null) {
      clearGPSWatch(this.watchId);
      this.watchId = null;
    }
    this.isWatching = false;
  }

  /**
   * Check if currently watching GPS
   */
  getIsWatching(): boolean {
    return this.isWatching;
  }

  /**
   * Get the last known location
   */
  getLastKnownLocation(): GPSLocationResult | null {
    return this.lastKnownLocation;
  }

  /**
   * Update service options
   */
  updateOptions(newOptions: Partial<GPSServiceOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Process raw GPS coordinates into location result
   */
  private processLocationData(coordinates: GPSCoordinates): GPSLocationResult {
    const isOnCampus = isWithinCampusBounds(coordinates.latitude, coordinates.longitude);
    const bestMatch = getBestGPSMatch(coordinates.latitude, coordinates.longitude);

    return {
      coordinates,
      bestMatch,
      isOnCampus,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopWatching();
    this.lastKnownLocation = null;
  }
}

// Singleton instance for global use
let globalGPSService: GPSLocationService | null = null;

/**
 * Get or create the global GPS service instance
 */
export function getGPSService(options?: GPSServiceOptions): GPSLocationService {
  if (!globalGPSService) {
    globalGPSService = new GPSLocationService(options);
  } else if (options) {
    globalGPSService.updateOptions(options);
  }
  
  return globalGPSService;
}

/**
 * Cleanup the global GPS service
 */
export function destroyGPSService(): void {
  if (globalGPSService) {
    globalGPSService.destroy();
    globalGPSService = null;
  }
}

/**
 * Hook-like function for React components to use GPS service
 */
export function useGPSLocation(options?: GPSServiceOptions) {
  const service = getGPSService(options);
  
  return {
    getCurrentLocation: () => service.getCurrentLocation(),
    startWatching: () => service.startWatching(),
    stopWatching: () => service.stopWatching(),
    isWatching: service.getIsWatching(),
    lastKnownLocation: service.getLastKnownLocation(),
    service
  };
}

/**
 * Utility function to request GPS permission
 */
export async function requestGPSPermission(): Promise<boolean> {
  try {
    const result = await getCurrentGPSPosition({
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 300000 // 5 minutes
    });
    
    return true;
  } catch (error) {
    console.error('GPS permission request failed:', error);
    return false;
  }
}

/**
 * Utility function to check if GPS is available
 */
export function isGPSAvailable(): boolean {
  return 'geolocation' in navigator;
}
