import { Injectable, Logger } from '@nestjs/common';

const logger = new Logger('TSPOptimizerService');

export interface TSPStop {
  stop_id: string;
  name: string;
  lat: number;
  lon: number;
  is_origin?: boolean;
  is_destination?: boolean;
  earliest_arrival?: string | null;
  latest_arrival?: string | null;
  estimated_dock_hours?: number;
}

export interface TSPResult {
  optimized_sequence: string[];
  total_distance: number;
  route_segments: [string, string, number][];
}

@Injectable()
export class TSPOptimizerService {
  private distanceMatrix: Map<string, number>;

  constructor(distanceMatrix: Map<string, number>) {
    this.distanceMatrix = distanceMatrix;
  }

  optimize(stops: TSPStop[], optimizationPriority = 'minimize_time'): TSPResult {
    if (stops.length === 0) {
      return { optimized_sequence: [], total_distance: 0.0, route_segments: [] };
    }

    if (stops.length === 1) {
      return { optimized_sequence: [stops[0].stop_id], total_distance: 0.0, route_segments: [] };
    }

    // Separate fixed stops (origin/destination) from waypoints
    let origin = stops.find((s) => s.is_origin);
    const destination = stops.find((s) => s.is_destination);
    let waypoints = stops.filter((s) => !s.is_origin && !s.is_destination);

    if (!origin) {
      // If no origin specified, use first stop
      origin = stops[0];
      waypoints = stops.slice(1).filter((s) => !s.is_destination);
    }

    // Step 1: Greedy nearest-neighbor for waypoints
    let greedySequence: string[];
    if (waypoints.length > 0) {
      greedySequence = this.greedyNearestNeighbor(origin, waypoints, destination);
    } else {
      // No waypoints, just origin to destination
      greedySequence = [origin.stop_id];
      if (destination) {
        greedySequence.push(destination.stop_id);
      }
    }

    // Step 2: Apply 2-opt improvement
    const improvedSequence = this.twoOptImprove(greedySequence);

    // Step 3: Calculate total distance and segments
    let totalDistance = 0.0;
    const routeSegments: [string, string, number][] = [];

    for (let i = 0; i < improvedSequence.length - 1; i++) {
      const fromStop = improvedSequence[i];
      const toStop = improvedSequence[i + 1];
      const distance = this.getDistance(fromStop, toStop);
      totalDistance += distance;
      routeSegments.push([fromStop, toStop, distance]);
    }

    logger.log(`TSP optimization complete: ${stops.length} stops, total distance: ${totalDistance.toFixed(1)} miles`);

    return {
      optimized_sequence: improvedSequence,
      total_distance: totalDistance,
      route_segments: routeSegments,
    };
  }

  private greedyNearestNeighbor(origin: TSPStop, waypoints: TSPStop[], destination: TSPStop | undefined): string[] {
    const sequence = [origin.stop_id];
    const unvisited = new Set(waypoints.map((w) => w.stop_id));
    let current = origin.stop_id;

    while (unvisited.size > 0) {
      let nearest: string | null = null;
      let nearestDistance = Infinity;

      for (const waypointId of unvisited) {
        const distance = this.getDistance(current, waypointId);
        if (distance < nearestDistance) {
          nearest = waypointId;
          nearestDistance = distance;
        }
      }

      if (nearest) {
        sequence.push(nearest);
        unvisited.delete(nearest);
        current = nearest;
      }
    }

    // Add destination if specified
    if (destination) {
      sequence.push(destination.stop_id);
    }

    return sequence;
  }

  private twoOptImprove(sequence: string[]): string[] {
    let improved = true;
    let bestSequence = [...sequence];

    // Limit iterations to prevent infinite loops
    const maxIterations = 100;
    let iteration = 0;

    while (improved && iteration < maxIterations) {
      improved = false;
      iteration++;

      for (let i = 1; i < bestSequence.length - 2; i++) {
        for (let j = i + 1; j < bestSequence.length; j++) {
          // Don't swap first or last stop (origin/destination fixed)
          if (i === 0 || j === bestSequence.length - 1) {
            continue;
          }

          // Try reversing segment [i:j]
          const newSequence = [
            ...bestSequence.slice(0, i),
            ...bestSequence.slice(i, j).reverse(),
            ...bestSequence.slice(j),
          ];

          // Calculate distance improvement
          const oldDistance = this.calculateTotalDistance(bestSequence);
          const newDistance = this.calculateTotalDistance(newSequence);

          if (newDistance < oldDistance) {
            bestSequence = newSequence;
            improved = true;
          }
        }
      }
    }

    return bestSequence;
  }

  private calculateTotalDistance(sequence: string[]): number {
    let total = 0.0;
    for (let i = 0; i < sequence.length - 1; i++) {
      total += this.getDistance(sequence[i], sequence[i + 1]);
    }
    return total;
  }

  private getDistance(fromStop: string, toStop: string): number {
    // Try both directions (matrix might be symmetric)
    const key1 = `${fromStop}:${toStop}`;
    const key2 = `${toStop}:${fromStop}`;

    const distance = this.distanceMatrix.get(key1) ?? this.distanceMatrix.get(key2);
    if (distance === undefined) {
      logger.warn(`Distance not found for ${fromStop} -> ${toStop}, using default 100 miles`);
      return 100.0; // Default fallback
    }
    return distance;
  }
}
