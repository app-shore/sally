import { Controller, Post, Get, Body, Param, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RoutePlanningEngineService } from '../../services/route-planning-engine/route-planning-engine.service';
import { DynamicUpdateHandlerService } from '../../services/dynamic-update-handler/dynamic-update-handler.service';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { DEFAULT_MVP_SOURCES, formatDataSourceBadge } from '../../utils/data-sources';

const StopInputSchema = z.object({
  stop_id: z.string().min(1),
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  location_type: z.enum(['warehouse', 'customer', 'distribution_center', 'truck_stop', 'service_area', 'fuel_station']),
  is_origin: z.boolean().default(false),
  is_destination: z.boolean().default(false),
  earliest_arrival: z.string().optional(),
  latest_arrival: z.string().optional(),
  estimated_dock_hours: z.number().min(0).default(0.0),
  customer_name: z.string().optional(),
});

const RoutePlanningRequestSchema = z.object({
  driver_id: z.string().min(1),
  vehicle_id: z.string().min(1),
  driver_state: z.object({
    hours_driven: z.number().min(0).max(11),
    on_duty_time: z.number().min(0).max(14),
    hours_since_break: z.number().min(0).max(8),
  }),
  vehicle_state: z.object({
    fuel_capacity_gallons: z.number().positive(),
    current_fuel_gallons: z.number().min(0),
    mpg: z.number().positive(),
  }),
  stops: z.array(StopInputSchema).min(2),
  optimization_priority: z.enum(['minimize_time', 'minimize_cost', 'balance']).default('minimize_time'),
  driver_preferences: z.object({
    preferred_rest_duration: z.number().min(7).max(10).default(10),
    avoid_night_driving: z.boolean().default(false),
  }).optional(),
});

const RouteUpdateRequestSchema = z.object({
  plan_id: z.string().min(1),
  update_type: z.enum(['traffic_delay', 'dock_time_change', 'load_added', 'load_cancelled', 'driver_rest_request', 'hos_violation']),
  segment_id: z.string().optional(),
  delay_minutes: z.number().optional(),
  actual_dock_hours: z.number().optional(),
  new_stop: StopInputSchema.optional(),
  cancelled_stop_id: z.string().optional(),
  rest_location: z.record(z.string(), z.unknown()).optional(),
  triggered_by: z.string().default('system'),
});

const TriggerInputSchema = z.object({
  trigger_type: z.string().min(1),
  segment_id: z.string().optional(),
  data: z.record(z.string(), z.unknown()).default({}),
});

@ApiTags('Route Planning')
@Controller('route-planning')
export class RoutePlanningController {
  private readonly logger = new Logger(RoutePlanningController.name);

  // In-memory plan cache (MVP - replace with DB in production)
  private planCache = new Map<string, { plan: Record<string, unknown>; driver_id: string }>();

  constructor(
    private readonly routePlanningEngine: RoutePlanningEngineService,
    private readonly updateHandler: DynamicUpdateHandlerService,
  ) {}

  @Post('optimize')
  @ApiOperation({ summary: 'Plan and optimize a complete route' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Optimized route plan' })
  async optimizeRoute(@Body() body: Record<string, unknown>) {
    this.logger.log(`Route optimization requested for driver ${body.driver_id}`);

    const parsed = RoutePlanningRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { detail: `Validation error: ${parsed.error.message}` },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    try {
      const data = parsed.data;
      const planId = `plan_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

      const result = this.routePlanningEngine.planRoute({
        driver_state: data.driver_state,
        vehicle_state: data.vehicle_state,
        stops: data.stops.map((s) => ({
          stop_id: s.stop_id,
          name: s.name,
          lat: s.lat,
          lon: s.lon,
          location_type: s.location_type,
          is_origin: s.is_origin,
          is_destination: s.is_destination,
          estimated_dock_hours: s.estimated_dock_hours,
          customer_name: s.customer_name,
        })),
        optimization_priority: data.optimization_priority,
      });

      // Build data source badges
      const dataSources: Record<string, { label: string; color: string; tooltip: string }> = {};
      for (const [key, source] of Object.entries(DEFAULT_MVP_SOURCES)) {
        dataSources[key] = formatDataSourceBadge(source);
      }

      // Build response with full structure
      const response = {
        plan_id: planId,
        plan_version: 1,
        is_feasible: result.is_feasible,
        feasibility_issues: result.feasibility_issues,
        optimized_sequence: result.optimized_sequence,
        segments: result.segments.map((seg) => ({
          sequence_order: seg.sequence_order,
          segment_type: seg.segment_type,
          from_location: seg.from_location,
          to_location: seg.to_location,
          distance_miles: seg.distance_miles,
          drive_time_hours: seg.drive_time_hours,
          rest_type: seg.rest_type,
          rest_duration_hours: seg.rest_duration_hours,
          rest_reason: seg.rest_reason,
          fuel_gallons: seg.fuel_gallons,
          fuel_cost_estimate: seg.fuel_cost_estimate,
          fuel_station_name: seg.fuel_station_name,
          dock_duration_hours: seg.dock_duration_hours,
          customer_name: seg.customer_name,
          hos_state_after: seg.hos_state_after,
          estimated_arrival: seg.estimated_arrival?.toISOString() || null,
          estimated_departure: seg.estimated_departure?.toISOString() || null,
        })),
        total_distance_miles: result.total_distance_miles,
        total_time_hours: result.total_drive_time_hours + result.total_on_duty_time_hours - data.driver_state.on_duty_time,
        total_cost_estimate: result.total_cost_estimate,
        rest_stops: result.rest_stops,
        fuel_stops: result.fuel_stops,
        summary: {
          total_driving_segments: result.segments.filter((s) => s.segment_type === 'drive').length,
          total_rest_stops: result.rest_stops.length,
          total_fuel_stops: result.fuel_stops.length,
          total_dock_stops: result.segments.filter((s) => s.segment_type === 'dock').length,
          estimated_completion: null,
        },
        compliance_report: result.compliance_report,
        data_sources: dataSources,
      };

      // Cache plan for status/update lookups
      this.planCache.set(planId, { plan: response as Record<string, unknown>, driver_id: data.driver_id });

      this.logger.log(`Route optimization completed: plan_id=${planId}, feasible=${result.is_feasible}, segments=${result.segments.length}`);
      return response;
    } catch (error) {
      this.logger.error(`Route optimization failed: ${error.message}`);
      throw new HttpException(
        { detail: error.message || 'Failed to optimize route' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('update')
  @ApiOperation({ summary: 'Update an existing route plan with dynamic triggers' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Route update result' })
  async updateRoute(@Body() body: Record<string, unknown>) {
    this.logger.log(`Route update requested for plan ${body.plan_id}`);

    const parsed = RouteUpdateRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { detail: `Validation error: ${parsed.error.message}` },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const data = parsed.data;

    try {
      // Analyze the update trigger
      const triggerData: Record<string, unknown> = {};
      if (data.delay_minutes) triggerData.delay_minutes = data.delay_minutes;
      if (data.actual_dock_hours) triggerData.actual_dock_hours = data.actual_dock_hours;
      if (data.rest_location) triggerData.rest_location = data.rest_location;

      const updateId = `update_${uuidv4().replace(/-/g, '').slice(0, 12)}`;

      // Determine priority based on update type
      let priority = 'MEDIUM';
      if (['hos_violation'].includes(data.update_type)) {
        priority = 'CRITICAL';
      } else if (['dock_time_change', 'load_added', 'load_cancelled', 'driver_rest_request'].includes(data.update_type)) {
        priority = 'HIGH';
      }

      const replanDecision = this.updateHandler.shouldReplan(null, data.update_type, triggerData, priority);

      const response = {
        update_id: updateId,
        plan_id: data.plan_id,
        replan_triggered: replanDecision.replan_triggered,
        new_plan: null,
        impact_summary: {
          update_type: data.update_type,
          priority,
          replan_triggered: replanDecision.replan_triggered,
          reason: replanDecision.reason,
          triggered_by: data.triggered_by,
          trigger_impacts: [
            {
              type: data.update_type,
              description: replanDecision.reason,
              eta_change_hours: data.delay_minutes ? data.delay_minutes / 60.0 : (data.actual_dock_hours || 0),
            },
          ],
        },
      };

      this.logger.log(`Route update completed: update_id=${updateId}, replan_triggered=${replanDecision.replan_triggered}`);
      return response;
    } catch (error) {
      this.logger.error(`Route update failed: ${error.message}`);
      throw new HttpException(
        { detail: error.message || 'Failed to update route' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status/:driverId')
  @ApiOperation({ summary: 'Get current route status for a driver' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Current route status' })
  async getRouteStatus(@Param('driverId') driverId: string) {
    this.logger.log(`Route status requested for driver ${driverId}`);

    // Find most recent plan for this driver (MVP: in-memory cache)
    let foundPlan: Record<string, unknown> | null = null;
    let foundPlanId: string | null = null;

    for (const [planId, entry] of this.planCache.entries()) {
      if (entry.driver_id === driverId) {
        foundPlan = entry.plan;
        foundPlanId = planId;
      }
    }

    if (!foundPlan) {
      throw new HttpException(
        { detail: `No active route found for driver: ${driverId}` },
        HttpStatus.NOT_FOUND,
      );
    }

    const response = {
      driver_id: driverId,
      plan_id: foundPlanId,
      current_plan: foundPlan,
      current_segment: {
        sequence_order: 1,
        segment_type: 'drive',
        from_location: null,
        to_location: null,
        progress_percent: 0.0,
        estimated_arrival: null,
      },
      upcoming_segments: [],
      alerts: [],
    };

    return response;
  }

  @Post('simulate-triggers')
  @ApiOperation({ summary: 'Simulate dynamic triggers on a route plan' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Simulation results' })
  async simulateTriggers(@Body() body: { plan_id: string; triggers: Array<Record<string, unknown>> }) {
    this.logger.log(`Trigger simulation requested for plan ${body.plan_id}`);

    if (!body.plan_id || !body.triggers || !Array.isArray(body.triggers)) {
      throw new HttpException(
        { detail: 'Missing required fields: plan_id, triggers[]' },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const impacts: Array<Record<string, unknown>> = [];
      let totalEtaChange = 0;
      let replanNeeded = false;
      const replanReasons: string[] = [];

      for (const trigger of body.triggers) {
        const parsedTrigger = TriggerInputSchema.safeParse(trigger);
        if (!parsedTrigger.success) {
          throw new HttpException(
            { detail: `Invalid trigger: ${parsedTrigger.error.message}` },
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }

        const t = parsedTrigger.data;
        let etaChange = 0;
        let requiresReplan = false;
        let description = '';

        switch (t.trigger_type) {
          case 'dock_time_change': {
            const actual = Number(t.data?.actual_dock_hours || 0);
            const estimated = Number(t.data?.estimated_dock_hours || 0);
            const variance = actual - estimated;
            etaChange = variance;
            requiresReplan = Math.abs(variance) > 2.0;
            description = `Dock time exceeded estimate by ${variance.toFixed(1)}h`;
            break;
          }
          case 'traffic_delay': {
            const delayMin = Number(t.data?.delay_minutes || 0);
            etaChange = delayMin / 60.0;
            requiresReplan = etaChange > 1.0;
            description = `Traffic delay of ${delayMin} minutes`;
            break;
          }
          case 'driver_rest_request': {
            const location = t.data?.location || 'current location';
            const reason = t.data?.reason || 'fatigue';
            etaChange = 10.0;
            requiresReplan = true;
            description = `Driver requests rest at ${location} due to ${reason}`;
            break;
          }
          case 'fuel_price_spike': {
            const oldPrice = Number(t.data?.old_price || 0);
            const newPrice = Number(t.data?.new_price || 0);
            const station = t.data?.station || '';
            etaChange = 0.5;
            requiresReplan = Math.abs(newPrice - oldPrice) > 0.50;
            description = `Fuel price at ${station} changed from $${oldPrice.toFixed(2)} to $${newPrice.toFixed(2)}`;
            break;
          }
          case 'appointment_change': {
            etaChange = 2.0;
            requiresReplan = true;
            description = `Appointment changed from ${t.data?.old_appointment} to ${t.data?.new_appointment}`;
            break;
          }
          case 'hos_violation': {
            const violationType = t.data?.violation_type || 'unknown';
            etaChange = 10.0;
            requiresReplan = true;
            description = `HOS violation detected: ${violationType}`;
            break;
          }
          default:
            throw new HttpException(
              { detail: `Unknown trigger type: ${t.trigger_type}` },
              HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }

        totalEtaChange += etaChange;
        if (requiresReplan) {
          replanNeeded = true;
          replanReasons.push(description);
        }

        impacts.push({
          type: t.trigger_type,
          segment: t.segment_id || null,
          description,
          eta_change_hours: etaChange,
        });
      }

      const currentVersion = 1; // MVP: Would come from plan
      const response = {
        previous_plan_version: currentVersion,
        new_plan_version: replanNeeded ? currentVersion + 1 : currentVersion,
        new_plan_id: replanNeeded ? `${body.plan_id}-v${currentVersion + 1}` : body.plan_id,
        triggers_applied: body.triggers.length,
        impact_summary: {
          total_eta_change_hours: Math.round(totalEtaChange * 100) / 100,
          rest_stops_added: 0,
          fuel_stops_added: 0,
          compliance_issues: [],
          trigger_impacts: impacts,
        },
        replan_triggered: replanNeeded,
        replan_reason: replanReasons.length > 0 ? replanReasons.join(' | ') : null,
      };

      this.logger.log(`Trigger simulation completed: ${body.triggers.length} triggers, replan=${replanNeeded}`);
      return response;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Trigger simulation failed: ${error.message}`);
      throw new HttpException(
        { detail: error.message || 'Failed to simulate triggers' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
