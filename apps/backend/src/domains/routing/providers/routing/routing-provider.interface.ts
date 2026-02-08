export interface LatLon {
  lat: number;
  lon: number;
  id?: string;
}

export interface DistanceMatrixEntry {
  distanceMiles: number;
  driveTimeHours: number;
}

export type DistanceMatrix = Map<string, DistanceMatrixEntry>;

export interface RouteResult {
  distanceMiles: number;
  driveTimeHours: number;
  geometry: string; // encoded polyline
  waypoints: LatLon[];
}

export const ROUTING_PROVIDER = 'ROUTING_PROVIDER';

export interface RoutingProvider {
  getDistanceMatrix(stops: LatLon[]): Promise<DistanceMatrix>;
  getRoute(
    origin: LatLon,
    destination: LatLon,
    waypoints?: LatLon[],
  ): Promise<RouteResult>;
}
