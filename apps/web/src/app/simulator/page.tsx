'use client';

import { useState } from 'react';
import { optimizeRoute, updateRoute } from '@/lib/api/routePlanning';
import type {
  RoutePlan,
  StopInput,
  DriverStateInput,
  VehicleStateInput,
} from '@/lib/types/routePlan';

export default function RouteSimulatorPage() {
  // Form state
  const [driverId, setDriverId] = useState('DRV-SIM-001');
  const [vehicleId, setVehicleId] = useState('VEH-SIM-001');

  const [driverState, setDriverState] = useState<DriverStateInput>({
    hours_driven: 5.5,
    on_duty_time: 6.0,
    hours_since_break: 5.0,
  });

  const [vehicleState, setVehicleState] = useState<VehicleStateInput>({
    fuel_capacity_gallons: 200.0,
    current_fuel_gallons: 120.0,
    mpg: 6.5,
  });

  const [stops, setStops] = useState<StopInput[]>([
    {
      stop_id: 'stop_001',
      name: 'Chicago Distribution Center',
      lat: 41.8781,
      lon: -87.6298,
      location_type: 'warehouse',
      is_origin: true,
      estimated_dock_hours: 1.0,
    },
    {
      stop_id: 'stop_002',
      name: 'Boston Customer',
      lat: 42.3601,
      lon: -71.0589,
      location_type: 'customer',
      estimated_dock_hours: 2.0,
      customer_name: 'ABC Corp',
    },
    {
      stop_id: 'stop_003',
      name: 'New York Warehouse',
      lat: 40.7128,
      lon: -74.006,
      location_type: 'warehouse',
      is_destination: true,
      estimated_dock_hours: 1.5,
    },
  ]);

  const [optimizationPriority, setOptimizationPriority] = useState<
    'minimize_time' | 'minimize_cost' | 'balance'
  >('minimize_time');

  // Result state
  const [result, setResult] = useState<RoutePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update/Replan state
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateType, setUpdateType] = useState<'traffic_delay' | 'dock_time_change' | 'load_added' | 'driver_rest_request'>('dock_time_change');
  const [updateData, setUpdateData] = useState({
    actual_dock_hours: 4.0,
    estimated_dock_hours: 2.0,
    delay_minutes: 30,
  });
  const [updateHistory, setUpdateHistory] = useState<any[]>([]);

  // Pre-defined scenarios
  const scenarios = {
    simple: {
      name: 'Simple 3-Stop Route (No HOS Issues)',
      driver: { hours_driven: 2.0, on_duty_time: 3.0, hours_since_break: 2.0 },
      vehicle: {
        fuel_capacity_gallons: 200.0,
        current_fuel_gallons: 180.0,
        mpg: 6.5,
      },
      stops: [
        {
          stop_id: 's1',
          name: 'Chicago Origin',
          lat: 41.8781,
          lon: -87.6298,
          location_type: 'warehouse' as const,
          is_origin: true,
          estimated_dock_hours: 0.5,
        },
        {
          stop_id: 's2',
          name: 'Indianapolis Stop',
          lat: 39.7684,
          lon: -86.158,
          location_type: 'customer' as const,
          estimated_dock_hours: 1.0,
        },
        {
          stop_id: 's3',
          name: 'Columbus Destination',
          lat: 39.9612,
          lon: -82.9988,
          location_type: 'warehouse' as const,
          is_destination: true,
          estimated_dock_hours: 0.5,
        },
      ],
    },
    hosConstrained: {
      name: 'Long Route Requiring Rest Stop',
      driver: { hours_driven: 8.0, on_duty_time: 9.0, hours_since_break: 7.5 },
      vehicle: {
        fuel_capacity_gallons: 200.0,
        current_fuel_gallons: 150.0,
        mpg: 6.0,
      },
      stops: [
        {
          stop_id: 's1',
          name: 'Atlanta Origin',
          lat: 33.749,
          lon: -84.388,
          location_type: 'warehouse' as const,
          is_origin: true,
          estimated_dock_hours: 1.0,
        },
        {
          stop_id: 's2',
          name: 'Charlotte Stop A',
          lat: 35.2271,
          lon: -80.8431,
          location_type: 'customer' as const,
          estimated_dock_hours: 2.0,
        },
        {
          stop_id: 's3',
          name: 'Richmond Stop B',
          lat: 37.5407,
          lon: -77.436,
          location_type: 'customer' as const,
          estimated_dock_hours: 1.5,
        },
        {
          stop_id: 's4',
          name: 'Philadelphia Destination',
          lat: 39.9526,
          lon: -75.1652,
          location_type: 'warehouse' as const,
          is_destination: true,
          estimated_dock_hours: 1.0,
        },
      ],
    },
    lowFuel: {
      name: 'Low Fuel Route',
      driver: { hours_driven: 5.0, on_duty_time: 6.0, hours_since_break: 5.0 },
      vehicle: {
        fuel_capacity_gallons: 200.0,
        current_fuel_gallons: 40.0,
        mpg: 6.0,
      },
      stops: [
        {
          stop_id: 's1',
          name: 'Dallas Origin',
          lat: 32.7767,
          lon: -96.797,
          location_type: 'warehouse' as const,
          is_origin: true,
          estimated_dock_hours: 0.5,
        },
        {
          stop_id: 's2',
          name: 'Oklahoma City Destination',
          lat: 35.4676,
          lon: -97.5164,
          location_type: 'customer' as const,
          is_destination: true,
          estimated_dock_hours: 2.0,
        },
      ],
    },
  };

  const loadScenario = (scenarioKey: keyof typeof scenarios) => {
    const scenario = scenarios[scenarioKey];
    setDriverState(scenario.driver);
    setVehicleState(scenario.vehicle);
    setStops(scenario.stops);
    setResult(null);
    setError(null);
  };

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    setUpdateHistory([]);

    try {
      const plan = await optimizeRoute({
        driver_id: driverId,
        vehicle_id: vehicleId,
        driver_state: driverState,
        vehicle_state: vehicleState,
        stops,
        optimization_priority: optimizationPriority,
      });

      setResult(plan);
    } catch (err: any) {
      setError(err.message || 'Failed to optimize route');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!result) {
      setError('No route plan to update. Optimize a route first.');
      return;
    }

    setUpdateLoading(true);
    setError(null);

    try {
      // Prepare update request based on update type
      let updateRequest: any = {
        plan_id: result.plan_id,
        update_type: updateType,
        triggered_by: 'driver' as const,
      };

      if (updateType === 'dock_time_change') {
        updateRequest.actual_dock_hours = updateData.actual_dock_hours;
      } else if (updateType === 'traffic_delay') {
        updateRequest.delay_minutes = updateData.delay_minutes;
      } else if (updateType === 'driver_rest_request') {
        updateRequest.rest_location = { name: 'Current Location' };
      }

      const updateResponse = await updateRoute(updateRequest);

      // Add to update history
      setUpdateHistory((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          type: updateType,
          replan_triggered: updateResponse.replan_triggered,
          impact_summary: updateResponse.impact_summary,
        },
      ]);

      // If replan was triggered, update the result
      if (updateResponse.replan_triggered && updateResponse.new_plan) {
        setResult(updateResponse.new_plan);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update route');
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚛 Route Planning Simulator
          </h1>
          <p className="text-gray-600">
            Test route optimization with different scenarios and parameters. Generate plans with REST optimization and simulate real-world trigger events.
          </p>
        </div>

        {/* Scenario Buttons */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => loadScenario('simple')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Load: Simple Route
          </button>
          <button
            onClick={() => loadScenario('hosConstrained')}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Load: HOS Constrained
          </button>
          <button
            onClick={() => loadScenario('lowFuel')}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Load: Low Fuel
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Input Panel */}
          <div className="space-y-6">
            {/* Driver & Vehicle IDs */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Identifiers</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver ID
                  </label>
                  <input
                    type="text"
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle ID
                  </label>
                  <input
                    type="text"
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Driver State */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Driver HOS State</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hours Driven (0-11)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="11"
                    value={driverState.hours_driven}
                    onChange={(e) =>
                      setDriverState({
                        ...driverState,
                        hours_driven: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    On-Duty Time (0-14)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="14"
                    value={driverState.on_duty_time}
                    onChange={(e) =>
                      setDriverState({
                        ...driverState,
                        on_duty_time: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hours Since Break (0-8)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="8"
                    value={driverState.hours_since_break}
                    onChange={(e) =>
                      setDriverState({
                        ...driverState,
                        hours_since_break: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle State */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Vehicle State</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel Capacity (gallons)
                  </label>
                  <input
                    type="number"
                    value={vehicleState.fuel_capacity_gallons}
                    onChange={(e) =>
                      setVehicleState({
                        ...vehicleState,
                        fuel_capacity_gallons: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Fuel (gallons)
                  </label>
                  <input
                    type="number"
                    value={vehicleState.current_fuel_gallons}
                    onChange={(e) =>
                      setVehicleState({
                        ...vehicleState,
                        current_fuel_gallons: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Miles Per Gallon
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={vehicleState.mpg}
                    onChange={(e) =>
                      setVehicleState({
                        ...vehicleState,
                        mpg: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Stops */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">
                Stops ({stops.length})
              </h2>
              <div className="space-y-3 text-sm">
                {stops.map((stop, idx) => (
                  <div
                    key={stop.stop_id}
                    className="p-3 bg-gray-50 rounded border border-gray-200"
                  >
                    <div className="font-medium">{stop.name}</div>
                    <div className="text-gray-600">
                      {stop.location_type} | Dock: {stop.estimated_dock_hours}h
                    </div>
                    <div className="text-xs text-gray-500">
                      ({stop.lat}, {stop.lon})
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Optimize Button */}
            <button
              onClick={handleOptimize}
              disabled={loading}
              className="w-full py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg"
            >
              {loading ? '⏳ Optimizing...' : '🚀 Optimize Route'}
            </button>
          </div>

          {/* Right: Results Panel */}
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="font-semibold text-red-800">Error</div>
                <div className="text-red-600">{error}</div>
              </div>
            )}

            {result && (
              <>
                {/* Summary Card */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4">Route Summary</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Plan ID</div>
                      <div className="font-mono text-sm">{result.plan_id}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Version</div>
                      <div className="font-semibold">
                        v{result.plan_version}
                        {result.plan_version > 1 && (
                          <span className="ml-1 text-xs text-orange-600">(Re-planned)</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Feasible</div>
                      <div className={result.is_feasible ? 'text-green-600' : 'text-red-600'}>
                        {result.is_feasible ? '✅ Yes' : '❌ No'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Distance</div>
                      <div className="font-semibold">
                        {result.total_distance_miles.toFixed(1)} mi
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Time</div>
                      <div className="font-semibold">
                        {result.total_time_hours.toFixed(1)}h
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Rest Stops</div>
                      <div className="font-semibold">
                        {result.summary.total_rest_stops}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Fuel Stops</div>
                      <div className="font-semibold">
                        {result.summary.total_fuel_stops}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compliance Report */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4">HOS Compliance</h2>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Drive Hours</span>
                        <span>
                          {result.compliance_report.max_drive_hours_used.toFixed(1)} / 11h
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(result.compliance_report.max_drive_hours_used / 11) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Duty Hours</span>
                        <span>
                          {result.compliance_report.max_duty_hours_used.toFixed(1)} / 14h
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full"
                          style={{
                            width: `${(result.compliance_report.max_duty_hours_used / 14) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    {result.compliance_report.violations.length > 0 && (
                      <div className="mt-3 p-3 bg-red-50 rounded">
                        <div className="font-semibold text-red-800">Violations:</div>
                        {result.compliance_report.violations.map((v, idx) => (
                          <div key={idx} className="text-red-600">
                            {v}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Segments */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4">
                    Route Segments ({result.segments.length})
                  </h2>
                  <div className="space-y-3">
                    {result.segments.map((seg) => (
                      <div
                        key={seg.sequence_order}
                        className={`p-4 rounded-lg border-2 ${
                          seg.segment_type === 'drive'
                            ? 'bg-blue-50 border-blue-200'
                            : seg.segment_type === 'rest'
                            ? 'bg-green-50 border-green-200'
                            : seg.segment_type === 'fuel'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-purple-50 border-purple-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold">
                            {seg.sequence_order}. {seg.segment_type.toUpperCase()}
                          </div>
                          {seg.segment_type === 'drive' && seg.distance_miles && (
                            <div className="text-sm">{seg.distance_miles.toFixed(1)} mi</div>
                          )}
                        </div>

                        {seg.segment_type === 'drive' && (
                          <div className="text-sm">
                            <div>
                              {seg.from_location} → {seg.to_location}
                            </div>
                            <div className="text-gray-600">
                              Drive: {seg.drive_time_hours?.toFixed(1)}h
                            </div>
                          </div>
                        )}

                        {seg.segment_type === 'rest' && (
                          <div className="text-sm">
                            <div className="font-medium">{seg.to_location}</div>
                            <div className="text-gray-600">
                              {seg.rest_type?.replace('_', ' ').toUpperCase()} -{' '}
                              {seg.rest_duration_hours}h
                            </div>
                            <div className="text-gray-500 italic">{seg.rest_reason}</div>
                          </div>
                        )}

                        {seg.segment_type === 'fuel' && (
                          <div className="text-sm">
                            <div className="font-medium">{seg.fuel_station_name}</div>
                            <div className="text-gray-600">
                              {seg.fuel_gallons?.toFixed(1)} gal - $
                              {seg.fuel_cost_estimate?.toFixed(2)}
                            </div>
                          </div>
                        )}

                        {seg.segment_type === 'dock' && (
                          <div className="text-sm">
                            <div className="font-medium">{seg.to_location}</div>
                            <div className="text-gray-600">
                              Dock: {seg.dock_duration_hours}h
                            </div>
                            {seg.customer_name && (
                              <div className="text-gray-500">{seg.customer_name}</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rest Stops Summary */}
                {result.rest_stops.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Rest Stops</h2>
                    <div className="space-y-2">
                      {result.rest_stops.map((stop, idx) => (
                        <div key={idx} className="p-3 bg-green-50 rounded">
                          <div className="font-medium">{stop.location}</div>
                          <div className="text-sm text-gray-600">
                            {stop.type.replace('_', ' ').toUpperCase()} - {stop.duration_hours}h
                          </div>
                          <div className="text-sm text-gray-500 italic">{stop.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fuel Stops Summary */}
                {result.fuel_stops.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Fuel Stops</h2>
                    <div className="space-y-2">
                      {result.fuel_stops.map((stop, idx) => (
                        <div key={idx} className="p-3 bg-yellow-50 rounded">
                          <div className="font-medium">{stop.location}</div>
                          <div className="text-sm text-gray-600">
                            {stop.gallons.toFixed(1)} gallons - ${stop.cost.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dynamic Update / Re-Plan Section */}
                <div className="bg-white p-6 rounded-lg shadow border-2 border-purple-200">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <span>🔄</span>
                    <span>Simulate Real-World Changes</span>
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Simulate changes like dock delays, traffic, or rest requests to trigger dynamic re-planning.
                  </p>

                  <div className="space-y-4">
                    {/* Update Type Selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Change Type
                      </label>
                      <select
                        value={updateType}
                        onChange={(e) => setUpdateType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="dock_time_change">Dock Time Change (Took Longer)</option>
                        <option value="traffic_delay">Traffic Delay</option>
                        <option value="driver_rest_request">Driver Requests Rest</option>
                      </select>
                    </div>

                    {/* Conditional Parameters */}
                    {updateType === 'dock_time_change' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estimated Dock Time (h)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={updateData.estimated_dock_hours}
                            onChange={(e) =>
                              setUpdateData({
                                ...updateData,
                                estimated_dock_hours: parseFloat(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Actual Dock Time (h)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={updateData.actual_dock_hours}
                            onChange={(e) =>
                              setUpdateData({
                                ...updateData,
                                actual_dock_hours: parseFloat(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    )}

                    {updateType === 'traffic_delay' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Delay (minutes)
                        </label>
                        <input
                          type="number"
                          step="5"
                          value={updateData.delay_minutes}
                          onChange={(e) =>
                            setUpdateData({
                              ...updateData,
                              delay_minutes: parseInt(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    )}

                    {updateType === 'driver_rest_request' && (
                      <div className="p-3 bg-purple-50 rounded text-sm text-gray-700">
                        Driver will request a full rest stop (10h) at current location.
                      </div>
                    )}

                    {/* Trigger Update Button */}
                    <button
                      onClick={handleUpdate}
                      disabled={updateLoading}
                      className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                    >
                      {updateLoading ? 'Processing Update...' : '🔄 Trigger Update & Re-Plan'}
                    </button>
                  </div>

                  {/* Update History */}
                  {updateHistory.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="font-semibold mb-3">Update History</h3>
                      <div className="space-y-2">
                        {updateHistory.map((update, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded text-sm ${
                              update.replan_triggered
                                ? 'bg-orange-50 border border-orange-200'
                                : 'bg-blue-50 border border-blue-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium">
                                {update.type.replace('_', ' ').toUpperCase()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(update.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="text-gray-700">
                              {update.replan_triggered ? (
                                <span className="text-orange-700 font-semibold">
                                  ✅ Re-plan triggered
                                </span>
                              ) : (
                                <span className="text-blue-700">
                                  ℹ️ ETA update only (no re-plan)
                                </span>
                              )}
                            </div>
                            {update.impact_summary && (
                              <div className="text-xs text-gray-600 mt-1">
                                {update.impact_summary.replan_reason ||
                                  update.impact_summary.no_replan_reason}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {!result && !error && (
              <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
                <div className="text-4xl mb-4">🗺️</div>
                <div>Select a scenario or configure parameters and click Optimize Route</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
