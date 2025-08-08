import { campusLocations } from './campus-data';

export interface GPSLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationData {
  name: string;
  confidence: number;
  lat?: number;
  lng?: number;
  source: 'ai' | 'gps' | 'fusion';
}

export interface FusionResult {
  location: LocationData;
  aiWeight: number;
  gpsWeight: number;
  aiConfidence: number;
  gpsConfidence: number;
  distance: number;
}

/**
 * Get current GPS location with high accuracy
 */
export const getCurrentGPSLocation = (): Promise<GPSLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000, // Cache for 30 seconds
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        });
      },
      (error) => {
        let errorMessage = 'Unknown GPS error';
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
      options
    );
  });
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Find the nearest campus location to given GPS coordinates
 */
export const findNearestCampusLocation = (lat: number, lng: number) => {
  let nearest = campusLocations[0];
  let minDistance = calculateDistance(lat, lng, nearest.lat, nearest.lng);

  campusLocations.forEach((location) => {
    const distance = calculateDistance(lat, lng, location.lat, location.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = location;
    }
  });

  return { ...nearest, distance: minDistance };
};

/**
 * Calculate GPS confidence based on accuracy and distance to nearest campus location
 */
export const calculateGPSConfidence = (
  gpsLocation: GPSLocation,
  nearestLocation: { distance: number }
): number => {
  // Base confidence from GPS accuracy (better accuracy = higher confidence)
  const accuracyConfidence = Math.max(0, Math.min(1, (100 - gpsLocation.accuracy) / 100));
  
  // Distance confidence (closer to campus = higher confidence)
  const maxCampusDistance = 1000; // 1km radius around campus
  const distanceConfidence = Math.max(0, 1 - (nearestLocation.distance / maxCampusDistance));
  
  // Combine both factors
  return (accuracyConfidence * 0.3) + (distanceConfidence * 0.7);
};

/**
 * Fuse AI prediction with GPS location using weighted algorithm
 * Default weights: 60% AI, 40% GPS
 */
export const fuseAIAndGPS = async (
  aiLocation: string,
  aiConfidence: number,
  gpsLocation: GPSLocation | null,
  aiWeight: number = 0.6,
  gpsWeight: number = 0.4
): Promise<FusionResult> => {
  // If no GPS, rely entirely on AI
  if (!gpsLocation) {
    const location = campusLocations.find((loc) => loc.name === aiLocation);
    return {
      location: {
        name: aiLocation,
        confidence: aiConfidence,
        lat: location?.lat,
        lng: location?.lng,
        source: 'ai',
      },
      aiWeight: 1.0,
      gpsWeight: 0.0,
      aiConfidence,
      gpsConfidence: 0,
      distance: 0,
    };
  }

  // Find nearest campus location to GPS coordinates
  const nearestLocation = findNearestCampusLocation(gpsLocation.lat, gpsLocation.lng);
  const gpsConfidence = calculateGPSConfidence(gpsLocation, nearestLocation);

  // Calculate weighted scores
  const aiScore = aiConfidence * aiWeight;
  const gpsScore = gpsConfidence * gpsWeight;

  // Determine final location based on higher weighted score
  const useAI = aiScore >= gpsScore;
  const finalLocationName = useAI ? aiLocation : nearestLocation.name;
  const finalConfidence = aiScore + gpsScore;

  const finalLocation = campusLocations.find((loc) => loc.name === finalLocationName);

  return {
    location: {
      name: finalLocationName,
      confidence: Math.min(1.0, finalConfidence), // Cap at 1.0
      lat: finalLocation?.lat,
      lng: finalLocation?.lng,
      source: useAI ? (gpsScore > 0 ? 'fusion' : 'ai') : 'gps',
    },
    aiWeight,
    gpsWeight,
    aiConfidence,
    gpsConfidence,
    distance: nearestLocation.distance,
  };
};

/**
 * Enhanced fusion with dynamic weight adjustment based on confidence levels
 */
export const adaptiveFuseAIAndGPS = async (
  aiLocation: string,
  aiConfidence: number,
  gpsLocation: GPSLocation | null
): Promise<FusionResult> => {
  if (!gpsLocation) {
    return fuseAIAndGPS(aiLocation, aiConfidence, gpsLocation, 1.0, 0.0);
  }

  const nearestLocation = findNearestCampusLocation(gpsLocation.lat, gpsLocation.lng);
  const gpsConfidence = calculateGPSConfidence(gpsLocation, nearestLocation);

  // Dynamic weight adjustment based on confidence levels
  let aiWeight = 0.6;
  let gpsWeight = 0.4;

  // If AI confidence is very high, increase AI weight
  if (aiConfidence > 0.8) {
    aiWeight = 0.75;
    gpsWeight = 0.25;
  }
  // If GPS confidence is very high and AI confidence is low, increase GPS weight
  else if (gpsConfidence > 0.7 && aiConfidence < 0.5) {
    aiWeight = 0.4;
    gpsWeight = 0.6;
  }
  // If both are low confidence, prefer GPS slightly
  else if (aiConfidence < 0.4 && gpsConfidence < 0.4) {
    aiWeight = 0.45;
    gpsWeight = 0.55;
  }

  return fuseAIAndGPS(aiLocation, aiConfidence, gpsLocation, aiWeight, gpsWeight);
};

/**
 * Validate if GPS location is within campus bounds
 */
export const isWithinCampusBounds = (lat: number, lng: number): boolean => {
  // Define campus bounding box (approximate)
  const campusBounds = {
    north: 12.865,
    south: 12.860,
    east: 77.441,
    west: 77.435,
  };

  return (
    lat >= campusBounds.south &&
    lat <= campusBounds.north &&
    lng >= campusBounds.west &&
    lng <= campusBounds.east
  );
};

/**
 * Get continuous GPS tracking for real-time updates
 */
export const startGPSTracking = (
  onLocationUpdate: (location: GPSLocation) => void,
  onError: (error: Error) => void
): number => {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation not supported'));
    return -1;
  }

  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000, // Update every 5 seconds
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      onLocationUpdate({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
      });
    },
    (error) => {
      onError(new Error(`GPS tracking error: ${error.message}`));
    },
    options
  );
};

/**
 * Stop GPS tracking
 */
export const stopGPSTracking = (watchId: number): void => {
  if (navigator.geolocation && watchId !== -1) {
    navigator.geolocation.clearWatch(watchId);
  }
};
