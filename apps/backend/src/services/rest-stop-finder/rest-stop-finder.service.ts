import { Injectable, Logger } from '@nestjs/common';
import { haversineDistance } from '../../utils/distance-calculator';

const logger = new Logger('RestStopFinderService');

export interface RestStopLocation {
  stop_id: string;
  name: string;
  lat: number;
  lon: number;
  location_type: string;
  amenities: string[];
  distance_from_point: number;
}

@Injectable()
export class RestStopFinderService {
  private truckStopsDb: Array<{
    stop_id: string;
    name: string;
    lat: number;
    lon: number;
    location_type: string;
    amenities: string[];
  }>;

  constructor() {
    this.truckStopsDb = this.loadTruckStopsDatabase();
  }

  private loadTruckStopsDatabase() {
    return [
      {
        stop_id: 'ts_i80_exit_123',
        name: 'Pilot Travel Center - I-80 Exit 123',
        lat: 41.2565,
        lon: -95.9345,
        location_type: 'truck_stop',
        amenities: ['parking', 'fuel', 'food', 'showers', 'laundry'],
      },
      {
        stop_id: 'ts_i80_exit_145',
        name: "Love's Travel Stop - I-80 Exit 145",
        lat: 41.1234,
        lon: -96.1234,
        location_type: 'truck_stop',
        amenities: ['parking', 'fuel', 'food'],
      },
      {
        stop_id: 'ts_i5_exit_200',
        name: 'TA Travel Center - I-5 Exit 200',
        lat: 34.0522,
        lon: -118.2437,
        location_type: 'truck_stop',
        amenities: ['parking', 'fuel', 'food', 'showers', 'truck_wash'],
      },
      {
        stop_id: 'ts_i95_exit_50',
        name: 'Petro Stopping Center - I-95 Exit 50',
        lat: 39.7392,
        lon: -104.9903,
        location_type: 'truck_stop',
        amenities: ['parking', 'fuel', 'food', 'showers'],
      },
      {
        stop_id: 'ts_i40_exit_100',
        name: 'Flying J - I-40 Exit 100',
        lat: 35.4676,
        lon: -97.5164,
        location_type: 'truck_stop',
        amenities: ['parking', 'fuel', 'food', 'showers', 'wifi'],
      },
    ];
  }

  findRestStopsNearPoint(
    lat: number,
    lon: number,
    radiusMiles = 50,
  ): RestStopLocation[] {
    const nearbyStops: RestStopLocation[] = [];

    for (const stop of this.truckStopsDb) {
      const distance = haversineDistance(lat, lon, stop.lat, stop.lon);
      if (distance <= radiusMiles) {
        nearbyStops.push({
          stop_id: stop.stop_id,
          name: stop.name,
          lat: stop.lat,
          lon: stop.lon,
          location_type: stop.location_type,
          amenities: stop.amenities,
          distance_from_point: distance,
        });
      }
    }

    nearbyStops.sort((a, b) => a.distance_from_point - b.distance_from_point);
    return nearbyStops;
  }

  findRestStopAlongRoute(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number,
  ): RestStopLocation | null {
    // Calculate midpoint
    const midLat = (fromLat + toLat) / 2;
    const midLon = (fromLon + toLon) / 2;

    const nearbyStops = this.findRestStopsNearPoint(midLat, midLon, 25);

    if (nearbyStops.length > 0) {
      return nearbyStops[0];
    }

    logger.warn(
      `No rest stops found along route from (${fromLat.toFixed(4)}, ${fromLon.toFixed(4)}) to (${toLat.toFixed(4)}, ${toLon.toFixed(4)})`,
    );
    return null;
  }

  getRestStopById(stopId: string): RestStopLocation | null {
    const stop = this.truckStopsDb.find((s) => s.stop_id === stopId);
    if (stop) {
      return { ...stop, distance_from_point: 0.0 };
    }
    return null;
  }
}
