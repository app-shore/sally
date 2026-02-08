import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

import { Configuration } from '../../../../config/configuration';
import {
  DistanceMatrix,
  LatLon,
  RouteResult,
  RoutingProvider,
} from './routing-provider.interface';

const METERS_TO_MILES = 0.000621371;
const SECONDS_TO_HOURS = 1 / 3600;
const TIMEOUT_MS = 30_000;

@Injectable()
export class HereRoutingProvider implements RoutingProvider {
  private readonly logger = new Logger(HereRoutingProvider.name);
  private readonly routeClient: AxiosInstance;
  private readonly matrixClient: AxiosInstance;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService<Configuration, true>,
  ) {
    this.apiKey = this.configService.get('hereApiKey', { infer: true }) ?? '';

    this.routeClient = axios.create({
      baseURL: 'https://router.hereapi.com/v8',
      timeout: TIMEOUT_MS,
    });

    this.matrixClient = axios.create({
      baseURL: 'https://matrix.router.hereapi.com/v8',
      timeout: TIMEOUT_MS,
    });

    this.logger.log('HERE Routing Provider initialized');
  }

  async getDistanceMatrix(stops: LatLon[]): Promise<DistanceMatrix> {
    if (stops.length < 2) {
      return new Map();
    }

    try {
      const origins = stops.map((s) => ({ lat: s.lat, lng: s.lon }));

      const response = await this.matrixClient.post(
        '/matrix',
        {
          origins,
          regionDefinition: { type: 'world' },
          transportMode: 'truck',
        },
        { params: { apiKey: this.apiKey } },
      );

      const { matrix } = response.data;
      const result: DistanceMatrix = new Map();
      const numDest = matrix.numDestinations;

      for (let i = 0; i < stops.length; i++) {
        for (let j = 0; j < stops.length; j++) {
          if (i === j) continue;

          const fromId = stops[i].id ?? `${i}`;
          const toId = stops[j].id ?? `${j}`;
          const key = `${fromId}:${toId}`;

          const idx = numDest * i + j;
          const errorCode = matrix.errorCodes?.[idx];

          if (errorCode && errorCode !== 0) {
            this.logger.warn(
              `HERE matrix error for ${key}: code ${errorCode}, using haversine`,
            );
            result.set(key, this.haversineEntry(stops[i], stops[j]));
            continue;
          }

          const distanceMiles = (matrix.distances?.[idx] ?? 0) * METERS_TO_MILES;
          const driveTimeHours =
            (matrix.travelTimes?.[idx] ?? 0) * SECONDS_TO_HOURS;

          result.set(key, { distanceMiles, driveTimeHours });
        }
      }

      return result;
    } catch (error) {
      this.logger.warn(
        `HERE matrix request failed, falling back to haversine: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.haversineFallbackMatrix(stops);
    }
  }

  async getRoute(
    origin: LatLon,
    destination: LatLon,
    waypoints?: LatLon[],
  ): Promise<RouteResult> {
    try {
      const params: Record<string, string> = {
        apiKey: this.apiKey,
        transportMode: 'truck',
        origin: `${origin.lat},${origin.lon}`,
        destination: `${destination.lat},${destination.lon}`,
        return: 'polyline,summary',
      };

      if (waypoints?.length) {
        waypoints.forEach((wp, i) => {
          params[`via${i > 0 ? i : ''}`] = `${wp.lat},${wp.lon}`;
        });
      }

      const response = await this.routeClient.get('/routes', { params });

      const route = response.data.routes[0];
      const section = route.sections[0];
      const summary = section.summary;

      // Aggregate all sections for multi-section routes
      let totalDistance = 0;
      let totalDuration = 0;
      const polylines: string[] = [];

      for (const sec of route.sections) {
        totalDistance += sec.summary.length;
        totalDuration += sec.summary.duration;
        if (sec.polyline) {
          polylines.push(sec.polyline);
        }
      }

      const resultWaypoints: LatLon[] = [
        {
          lat: section.departure.place.location.lat,
          lon: section.departure.place.location.lng,
        },
        {
          lat: route.sections[route.sections.length - 1].arrival.place.location
            .lat,
          lon: route.sections[route.sections.length - 1].arrival.place.location
            .lng,
        },
      ];

      return {
        distanceMiles: totalDistance * METERS_TO_MILES,
        driveTimeHours: totalDuration * SECONDS_TO_HOURS,
        geometry: polylines.join(';'),
        waypoints: resultWaypoints,
      };
    } catch (error) {
      this.logger.warn(
        `HERE route request failed, falling back to haversine: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.haversineFallbackRoute(origin, destination, waypoints);
    }
  }

  // ---------------------------------------------------------------------------
  // Haversine fallback
  // ---------------------------------------------------------------------------

  private haversineFallbackMatrix(stops: LatLon[]): DistanceMatrix {
    const matrix: DistanceMatrix = new Map();

    for (let i = 0; i < stops.length; i++) {
      for (let j = 0; j < stops.length; j++) {
        if (i === j) continue;

        const fromId = stops[i].id ?? `${i}`;
        const toId = stops[j].id ?? `${j}`;
        matrix.set(`${fromId}:${toId}`, this.haversineEntry(stops[i], stops[j]));
      }
    }

    return matrix;
  }

  private haversineFallbackRoute(
    origin: LatLon,
    destination: LatLon,
    waypoints?: LatLon[],
  ): RouteResult {
    const points = [origin, ...(waypoints ?? []), destination];
    let totalDistance = 0;
    let totalTime = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const entry = this.haversineEntry(points[i], points[i + 1]);
      totalDistance += entry.distanceMiles;
      totalTime += entry.driveTimeHours;
    }

    return {
      distanceMiles: totalDistance,
      driveTimeHours: totalTime,
      geometry: '',
      waypoints: points,
    };
  }

  private haversineEntry(
    a: LatLon,
    b: LatLon,
  ): { distanceMiles: number; driveTimeHours: number } {
    const straightLineMiles = this.haversineDistance(a, b);
    const distanceMiles = straightLineMiles * 1.3; // road factor
    const driveTimeHours = distanceMiles / 55; // avg truck speed

    return { distanceMiles, driveTimeHours };
  }

  private haversineDistance(a: LatLon, b: LatLon): number {
    const R = 3958.8;
    const dLat = this.toRad(b.lat - a.lat);
    const dLon = this.toRad(b.lon - a.lon);

    const sinHalfLat = Math.sin(dLat / 2);
    const sinHalfLon = Math.sin(dLon / 2);

    const h =
      sinHalfLat * sinHalfLat +
      Math.cos(this.toRad(a.lat)) *
        Math.cos(this.toRad(b.lat)) *
        sinHalfLon *
        sinHalfLon;

    return 2 * R * Math.asin(Math.sqrt(h));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}
