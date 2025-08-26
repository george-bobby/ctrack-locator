import { campusLocations } from './campus-data';

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface LocationMatch {
  name: string;
  distance: number;
  confidence: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface GPSPermissionState {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

/**
 * Calculate the distance between two GPS coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Find the nearest campus location based on GPS coordinates
 * @param userLat User's latitude
 * @param userLng User's longitude
 * @returns Array of location matches sorted by distance
 */
export function findNearestLocations(userLat: number, userLng: number): LocationMatch[] {
  const matches: LocationMatch[] = campusLocations.map(location => {
    const distance = calculateDistance(userLat, userLng, location.lat, location.lng);
    
    // Calculate confidence based on distance (closer = higher confidence)
    // Max confidence at 0m, decreases to 0 at 200m
    const maxDistance = 200; // meters
    const confidence = Math.max(0, Math.min(1, 1 - (distance / maxDistance)));
    
    return {
      name: location.name,
      distance,
      confidence,
      coordinates: {
        lat: location.lat,
        lng: location.lng
      }
    };
  });

  // Sort by distance (nearest first)
  return matches.sort((a, b) => a.distance - b.distance);
}

/**
 * Get the most likely location based on GPS coordinates
 * @param userLat User's latitude
 * @param userLng User's longitude
 * @returns The most likely location match
 */
export function getBestGPSMatch(userLat: number, userLng: number): LocationMatch | null {
  const matches = findNearestLocations(userLat, userLng);
  
  if (matches.length === 0) return null;
  
  const bestMatch = matches[0];
  
  // Only return if within reasonable campus bounds (500m)
  if (bestMatch.distance > 500) return null;
  
  return bestMatch;
}

/**
 * Check GPS permission status
 * @returns Promise with permission state
 */
export async function checkGPSPermission(): Promise<GPSPermissionState> {
  if (!navigator.geolocation) {
    return { granted: false, denied: true, prompt: false };
  }

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return {
      granted: permission.state === 'granted',
      denied: permission.state === 'denied',
      prompt: permission.state === 'prompt'
    };
  } catch (error) {
    // Fallback for browsers that don't support permissions API
    return { granted: false, denied: false, prompt: true };
  }
}

/**
 * Request GPS permission and get current position
 * @param options Geolocation options
 * @returns Promise with GPS coordinates
 */
export function getCurrentGPSPosition(options?: PositionOptions): Promise<GPSCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // Cache for 1 minute
      ...options
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        let errorMessage = 'Failed to get GPS location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'GPS access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'GPS position unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'GPS request timed out';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      defaultOptions
    );
  });
}

/**
 * Watch GPS position for continuous updates
 * @param callback Function to call with new position
 * @param options Geolocation options
 * @returns Watch ID for clearing the watch
 */
export function watchGPSPosition(
  callback: (coordinates: GPSCoordinates) => void,
  errorCallback?: (error: Error) => void,
  options?: PositionOptions
): number | null {
  if (!navigator.geolocation) {
    errorCallback?.(new Error('Geolocation is not supported by this browser'));
    return null;
  }

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000, // Cache for 30 seconds
    ...options
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      });
    },
    (error) => {
      let errorMessage = 'Failed to watch GPS location';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'GPS access denied by user';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'GPS position unavailable';
          break;
        case error.TIMEOUT:
          errorMessage = 'GPS request timed out';
          break;
      }
      
      errorCallback?.(new Error(errorMessage));
    },
    defaultOptions
  );
}

/**
 * Clear GPS position watch
 * @param watchId Watch ID returned by watchGPSPosition
 */
export function clearGPSWatch(watchId: number): void {
  if (navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Check if coordinates are within campus bounds
 * @param lat Latitude
 * @param lng Longitude
 * @returns True if within campus bounds
 */
export function isWithinCampusBounds(lat: number, lng: number): boolean {
  // Define campus bounding box based on the campus locations
  const minLat = Math.min(...campusLocations.map(loc => loc.lat)) - 0.002; // ~200m buffer
  const maxLat = Math.max(...campusLocations.map(loc => loc.lat)) + 0.002;
  const minLng = Math.min(...campusLocations.map(loc => loc.lng)) - 0.002;
  const maxLng = Math.max(...campusLocations.map(loc => loc.lng)) + 0.002;
  
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}
