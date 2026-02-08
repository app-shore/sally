export interface FuelStop {
  stopId: string;
  name: string;
  lat: number;
  lon: number;
  city: string;
  state: string;
  fuelPricePerGallon: number;
  brand: string;
  amenities: string[];
  distanceFromRoute: number; // miles off-route
}

export const FUEL_DATA_PROVIDER = 'FUEL_DATA_PROVIDER';

export interface FuelDataProvider {
  findFuelStopsNearPoint(
    lat: number,
    lon: number,
    radiusMiles: number,
  ): Promise<FuelStop[]>;

  findFuelStopsAlongCorridor(
    fromLat: number,
    fromLon: number,
    toLat: number,
    toLon: number,
    corridorWidthMiles: number,
  ): Promise<FuelStop[]>;
}
