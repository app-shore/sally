"""TSP Optimizer for route sequencing.

Implements greedy nearest-neighbor with 2-opt improvement for routing optimization.
Good for up to 20 stops, provides solutions within 10-15% of optimal.
"""

import logging
from dataclasses import dataclass
from typing import List, Tuple

logger = logging.getLogger(__name__)


@dataclass
class Stop:
    """Represents a stop in the route."""

    stop_id: str
    name: str
    lat: float
    lon: float
    is_origin: bool = False
    is_destination: bool = False
    earliest_arrival: str | None = None  # Time string "08:00"
    latest_arrival: str | None = None  # Time string "17:00"
    estimated_dock_hours: float = 0.0


@dataclass
class TSPResult:
    """Result of TSP optimization."""

    optimized_sequence: List[str]  # List of stop_ids in order
    total_distance: float  # Total distance in miles
    route_segments: List[Tuple[str, str, float]]  # List of (from_stop_id, to_stop_id, distance)


class TSPOptimizer:
    """TSP Optimizer using greedy nearest-neighbor + 2-opt improvement."""

    def __init__(self, distance_matrix: dict[Tuple[str, str], float]):
        """
        Initialize TSP optimizer with distance matrix.

        Args:
            distance_matrix: Dictionary mapping (stop_id_1, stop_id_2) -> distance_miles
        """
        self.distance_matrix = distance_matrix

    def optimize(
        self, stops: List[Stop], optimization_priority: str = "minimize_time"
    ) -> TSPResult:
        """
        Optimize stop sequence using greedy nearest-neighbor + 2-opt.

        Args:
            stops: List of Stop objects to sequence
            optimization_priority: 'minimize_time' or 'minimize_cost' (future)

        Returns:
            TSPResult with optimized sequence
        """
        if len(stops) == 0:
            return TSPResult(optimized_sequence=[], total_distance=0.0, route_segments=[])

        if len(stops) == 1:
            return TSPResult(
                optimized_sequence=[stops[0].stop_id],
                total_distance=0.0,
                route_segments=[],
            )

        # Separate fixed stops (origin/destination) from waypoints
        origin = next((s for s in stops if s.is_origin), None)
        destination = next((s for s in stops if s.is_destination), None)
        waypoints = [s for s in stops if not s.is_origin and not s.is_destination]

        if not origin:
            # If no origin specified, use first stop
            origin = stops[0]
            waypoints = stops[1:]

        # Step 1: Greedy nearest-neighbor for waypoints
        if len(waypoints) > 0:
            greedy_sequence = self._greedy_nearest_neighbor(origin, waypoints, destination)
        else:
            # No waypoints, just origin to destination
            greedy_sequence = [origin.stop_id]
            if destination:
                greedy_sequence.append(destination.stop_id)

        # Step 2: Apply 2-opt improvement
        improved_sequence = self._two_opt_improve(greedy_sequence)

        # Step 3: Calculate total distance and segments
        total_distance = 0.0
        route_segments = []

        for i in range(len(improved_sequence) - 1):
            from_stop = improved_sequence[i]
            to_stop = improved_sequence[i + 1]
            distance = self._get_distance(from_stop, to_stop)
            total_distance += distance
            route_segments.append((from_stop, to_stop, distance))

        logger.info(
            f"TSP optimization complete: {len(stops)} stops, "
            f"total distance: {total_distance:.1f} miles"
        )

        return TSPResult(
            optimized_sequence=improved_sequence,
            total_distance=total_distance,
            route_segments=route_segments,
        )

    def _greedy_nearest_neighbor(
        self, origin: Stop, waypoints: List[Stop], destination: Stop | None
    ) -> List[str]:
        """
        Greedy nearest-neighbor algorithm.

        Start at origin, repeatedly visit nearest unvisited waypoint, end at destination.
        """
        sequence = [origin.stop_id]
        unvisited = set(w.stop_id for w in waypoints)
        current = origin.stop_id

        while unvisited:
            # Find nearest unvisited waypoint
            nearest = None
            nearest_distance = float("inf")

            for waypoint_id in unvisited:
                distance = self._get_distance(current, waypoint_id)
                if distance < nearest_distance:
                    nearest = waypoint_id
                    nearest_distance = distance

            if nearest:
                sequence.append(nearest)
                unvisited.remove(nearest)
                current = nearest

        # Add destination if specified
        if destination:
            sequence.append(destination.stop_id)

        return sequence

    def _two_opt_improve(self, sequence: List[str]) -> List[str]:
        """
        2-opt improvement algorithm.

        Repeatedly try swapping edges to reduce total distance.
        """
        improved = True
        best_sequence = sequence[:]

        # Limit iterations to prevent infinite loops
        max_iterations = 100
        iteration = 0

        while improved and iteration < max_iterations:
            improved = False
            iteration += 1

            for i in range(1, len(best_sequence) - 2):
                for j in range(i + 1, len(best_sequence)):
                    # Don't swap first or last stop (origin/destination fixed)
                    if i == 0 or j == len(best_sequence) - 1:
                        continue

                    # Try reversing segment [i:j]
                    new_sequence = best_sequence[:i] + best_sequence[i:j][::-1] + best_sequence[j:]

                    # Calculate distance improvement
                    old_distance = self._calculate_total_distance(best_sequence)
                    new_distance = self._calculate_total_distance(new_sequence)

                    if new_distance < old_distance:
                        best_sequence = new_sequence
                        improved = True
                        logger.debug(
                            f"2-opt improvement: {old_distance:.1f} -> {new_distance:.1f} miles"
                        )

        return best_sequence

    def _calculate_total_distance(self, sequence: List[str]) -> float:
        """Calculate total distance for a sequence."""
        total = 0.0
        for i in range(len(sequence) - 1):
            total += self._get_distance(sequence[i], sequence[i + 1])
        return total

    def _get_distance(self, from_stop: str, to_stop: str) -> float:
        """Get distance between two stops from distance matrix."""
        # Try both directions (matrix might be symmetric)
        distance = self.distance_matrix.get((from_stop, to_stop))
        if distance is None:
            distance = self.distance_matrix.get((to_stop, from_stop))
        if distance is None:
            logger.warning(
                f"Distance not found for {from_stop} -> {to_stop}, using default 100 miles"
            )
            return 100.0  # Default fallback
        return distance


def optimize_route_sequence(
    stops: List[Stop], distance_matrix: dict[Tuple[str, str], float]
) -> TSPResult:
    """
    Convenience function to optimize route sequence.

    Args:
        stops: List of Stop objects
        distance_matrix: Distance matrix mapping (stop_id, stop_id) -> miles

    Returns:
        TSPResult with optimized sequence
    """
    optimizer = TSPOptimizer(distance_matrix)
    return optimizer.optimize(stops)
