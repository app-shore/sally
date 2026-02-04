import { Injectable, Logger } from '@nestjs/common';
import { haversineDistance } from '../../utils/distance-calculator';

const logger = new Logger('FuelStopOptimizerService');

export interface FuelStopLocation {
  stop_id: string;
  name: string;
  lat: number;
  lon: number;
  price_per_gallon: number;
  distance_from_point: number;
  last_price_update: string;
}

export interface FuelStopRecommendation {
  should_fuel: boolean;
  fuel_stop: FuelStopLocation | null;
  gallons_needed: number;
  estimated_cost: number;
  reason: string;
}

@Injectable()
export class FuelStopOptimizerService {
  private static readonly LOW_FUEL_THRESHOLD = 0.25;
  private static readonly OPTIMAL_FUEL_BUFFER = 0.2;

  private fuelStationsDb: Array<{
    stop_id: string;
    name: string;
    lat: number;
    lon: number;
    price_per_gallon: number;
    last_price_update: string;
  }>;

  constructor() {
    this.fuelStationsDb = this.loadFuelStationsDatabase();
  }

  private loadFuelStationsDatabase() {
    return [
      {
        stop_id: 'fuel_i80_exit_120',
        name: 'Pilot Fuel - I-80 Exit 120',
        lat: 41.25,
        lon: -95.9,
        price_per_gallon: 3.89,
        last_price_update: '2025-01-20',
      },
      {
        stop_id: 'fuel_i80_exit_140',
        name: "Love's Diesel - I-80 Exit 140",
        lat: 41.1,
        lon: -96.1,
        price_per_gallon: 3.95,
        last_price_update: '2025-01-20',
      },
      {
        stop_id: 'fuel_i5_exit_198',
        name: 'TA Fuel - I-5 Exit 198',
        lat: 34.04,
        lon: -118.25,
        price_per_gallon: 4.15,
        last_price_update: '2025-01-20',
      },
      {
        stop_id: 'fuel_i95_exit_48',
        name: 'Flying J Diesel - I-95 Exit 48',
        lat: 39.73,
        lon: -104.98,
        price_per_gallon: 3.79,
        last_price_update: '2025-01-20',
      },
    ];
  }

  shouldRefuel(
    currentFuelGallons: number,
    fuelCapacityGallons: number,
    remainingDistanceMiles: number,
    mpg: number,
  ): FuelStopRecommendation {
    const fuelNeededForDistance = remainingDistanceMiles / mpg;
    const fuelPercentage = currentFuelGallons / fuelCapacityGallons;
    const fuelNeededWithBuffer =
      fuelNeededForDistance *
      (1 + FuelStopOptimizerService.OPTIMAL_FUEL_BUFFER);

    if (currentFuelGallons >= fuelNeededWithBuffer) {
      return {
        should_fuel: false,
        fuel_stop: null,
        gallons_needed: 0.0,
        estimated_cost: 0.0,
        reason: `Sufficient fuel: ${currentFuelGallons.toFixed(1)} gallons available, need ${fuelNeededForDistance.toFixed(1)} gallons (+${(FuelStopOptimizerService.OPTIMAL_FUEL_BUFFER * 100).toFixed(0)}% buffer)`,
      };
    }

    if (fuelPercentage < FuelStopOptimizerService.LOW_FUEL_THRESHOLD) {
      const gallonsToFill = fuelCapacityGallons - currentFuelGallons;
      return {
        should_fuel: true,
        fuel_stop: null,
        gallons_needed: gallonsToFill,
        estimated_cost: 0.0,
        reason: `CRITICAL: Fuel at ${(fuelPercentage * 100).toFixed(1)}% (threshold: ${(FuelStopOptimizerService.LOW_FUEL_THRESHOLD * 100).toFixed(0)}%). Need ${gallonsToFill.toFixed(1)} gallons.`,
      };
    }

    const gallonsToFill = fuelNeededWithBuffer - currentFuelGallons;
    return {
      should_fuel: true,
      fuel_stop: null,
      gallons_needed: gallonsToFill,
      estimated_cost: 0.0,
      reason: `Insufficient fuel for remaining distance. Current: ${currentFuelGallons.toFixed(1)} gal, Need: ${fuelNeededWithBuffer.toFixed(1)} gal`,
    };
  }

  findFuelStopNearPoint(
    lat: number,
    lon: number,
    radiusMiles = 30,
  ): FuelStopLocation[] {
    const nearbyStations: FuelStopLocation[] = [];

    for (const station of this.fuelStationsDb) {
      const distance = haversineDistance(lat, lon, station.lat, station.lon);
      if (distance <= radiusMiles) {
        nearbyStations.push({
          stop_id: station.stop_id,
          name: station.name,
          lat: station.lat,
          lon: station.lon,
          price_per_gallon: station.price_per_gallon,
          distance_from_point: distance,
          last_price_update: station.last_price_update,
        });
      }
    }

    nearbyStations.sort((a, b) => a.price_per_gallon - b.price_per_gallon);
    return nearbyStations;
  }

  optimizeFuelStop(
    currentLat: number,
    currentLon: number,
    destinationLat: number,
    destinationLon: number,
    currentFuel: number,
    fuelCapacity: number,
    mpg: number,
  ): FuelStopRecommendation {
    const remainingDistance = haversineDistance(
      currentLat,
      currentLon,
      destinationLat,
      destinationLon,
    );

    const recommendation = this.shouldRefuel(
      currentFuel,
      fuelCapacity,
      remainingDistance,
      mpg,
    );

    if (!recommendation.should_fuel) {
      return recommendation;
    }

    const fuelStops = this.findFuelStopNearPoint(currentLat, currentLon, 30);

    if (fuelStops.length === 0) {
      logger.warn('No fuel stations found near current location');
      recommendation.reason += ' WARNING: No fuel stations found nearby.';
      return recommendation;
    }

    const bestStop = fuelStops[0];
    const estimatedCost =
      recommendation.gallons_needed * bestStop.price_per_gallon;

    recommendation.fuel_stop = bestStop;
    recommendation.estimated_cost = estimatedCost;
    recommendation.reason += ` Recommended: ${bestStop.name} at $${bestStop.price_per_gallon.toFixed(2)}/gal (${bestStop.distance_from_point.toFixed(1)} miles away). Total cost: $${estimatedCost.toFixed(2)}`;

    return recommendation;
  }
}
