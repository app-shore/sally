import { Logger } from '@nestjs/common';
import axios from 'axios';

const logger = new Logger('DistanceCalculator');

export type DistanceMethod = 'haversine' | 'google_maps';

export interface DistanceResult {
  distanceMiles: number;
  durationHours: number;
  method: DistanceMethod;
}

/**
 * Calculate straight-line distance between two points using Haversine formula
 * Fast, accurate within ~10-15% of road distance
 * Road factor of 1.2 applied for better approximation
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Earth radius in miles
  const R = 3959.0;

  // Convert to radians
  const lat1Rad = lat1 * (Math.PI / 180);
  const lat2Rad = lat2 * (Math.PI / 180);
  const deltaLat = (lat2 - lat1) * (Math.PI / 180);
  const deltaLon = (lon2 - lon1) * (Math.PI / 180);

  // Haversine formula
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.asin(Math.sqrt(a));

  return R * c;
}

/**
 * Calculate distance and duration using Google Maps Distance Matrix API
 * Requires GOOGLE_MAPS_API_KEY environment variable
 * More accurate than Haversine as it follows actual roads
 */
export async function calculateGoogleMapsDistance(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number
): Promise<{ distanceMiles: number; durationHours: number }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured. Use Haversine method or set API key.');
  }

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: `${originLat},${originLon}`,
        destinations: `${destLat},${destLon}`,
        key: apiKey,
        units: 'imperial', // Miles
      },
      timeout: 5000, // 5 second timeout
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    const element = response.data.rows[0]?.elements[0];
    if (element?.status !== 'OK') {
      throw new Error(`No route found: ${element?.status}`);
    }

    const distanceMeters = element.distance.value;
    const durationSeconds = element.duration.value;

    return {
      distanceMiles: distanceMeters * 0.000621371, // Convert meters to miles
      durationHours: durationSeconds / 3600, // Convert seconds to hours
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Google Maps API request failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Calculate distance between two points with automatic method selection
 * Uses Google Maps if API key is configured, otherwise falls back to Haversine
 *
 * @param lat1 Origin latitude
 * @param lon1 Origin longitude
 * @param lat2 Destination latitude
 * @param lon2 Destination longitude
 * @param preferredMethod Optional: force a specific calculation method
 * @returns Distance result with method used
 */
export async function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  preferredMethod?: DistanceMethod
): Promise<DistanceResult> {
  const method = preferredMethod || (process.env.DISTANCE_CALCULATION_METHOD as DistanceMethod) || 'haversine';

  // If Google Maps is preferred and API key is available, try it first
  if (method === 'google_maps' && process.env.GOOGLE_MAPS_API_KEY) {
    try {
      const result = await calculateGoogleMapsDistance(lat1, lon1, lat2, lon2);
      logger.log(`Distance calculated via Google Maps: ${result.distanceMiles.toFixed(1)} mi, ${result.durationHours.toFixed(2)} hrs`);
      return {
        ...result,
        method: 'google_maps',
      };
    } catch (error) {
      logger.warn(`Google Maps API failed, falling back to Haversine: ${error}`);
      // Fall through to Haversine
    }
  }

  // Use Haversine formula (default or fallback)
  const straightLineDistance = haversineDistance(lat1, lon1, lat2, lon2);
  const distanceMiles = straightLineDistance * 1.2; // Apply road factor
  const durationHours = estimateDriveTime(distanceMiles);

  logger.debug(`Distance calculated via Haversine: ${distanceMiles.toFixed(1)} mi, ${durationHours.toFixed(2)} hrs`);

  return {
    distanceMiles,
    durationHours,
    method: 'haversine',
  };
}

/**
 * Calculate distance matrix for all stop pairs
 * Uses Haversine with road factor for speed (matrix calculations are O(n²))
 * For individual route planning, use calculateDistance() for Google Maps support
 */
export function calculateDistanceMatrix(
  stops: Array<{ stop_id: string; lat: number; lon: number }>
): Map<string, number> {
  const matrix = new Map<string, number>();

  for (let i = 0; i < stops.length; i++) {
    for (let j = 0; j < stops.length; j++) {
      const stop1 = stops[i];
      const stop2 = stops[j];
      const key = `${stop1.stop_id}:${stop2.stop_id}`;

      if (i === j) {
        matrix.set(key, 0.0);
      } else {
        const distance = haversineDistance(stop1.lat, stop1.lon, stop2.lat, stop2.lon);
        // Apply road factor (straight-line * 1.2 for road routing approximation)
        matrix.set(key, distance * 1.2);
      }
    }
  }

  logger.log(`Calculated distance matrix for ${stops.length} stops (using Haversine with 1.2x road factor)`);
  return matrix;
}

export function estimateDriveTime(distanceMiles: number, roadType = 'highway'): number {
  // Average speeds by road type (mph)
  const speeds: Record<string, number> = { interstate: 60, highway: 50, city: 30 };
  const avgSpeed = speeds[roadType] ?? 55; // Default to 55 mph

  return distanceMiles / avgSpeed;
}
