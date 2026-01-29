import { Logger } from '@nestjs/common';

const logger = new Logger('DistanceCalculator');

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

  logger.log(`Calculated distance matrix for ${stops.length} stops`);
  return matrix;
}

export function estimateDriveTime(distanceMiles: number, roadType = 'highway'): number {
  // Average speeds by road type (mph)
  const speeds: Record<string, number> = { interstate: 60, highway: 50, city: 30 };
  const avgSpeed = speeds[roadType] ?? 55; // Default to 55 mph

  return distanceMiles / avgSpeed;
}
