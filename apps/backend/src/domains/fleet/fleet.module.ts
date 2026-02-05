import { Module } from '@nestjs/common';
import { DriversModule } from './drivers/drivers.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { LoadsModule } from './loads/loads.module';

/**
 * FleetModule is an aggregate module that combines all fleet-related functionality.
 * It provides a single entry point for the entire fleet domain.
 *
 * Subdomains:
 * - Drivers: Driver management and activation
 * - Vehicles: Vehicle management
 * - Loads: Load and stop management
 */
@Module({
  imports: [DriversModule, VehiclesModule, LoadsModule],
  exports: [DriversModule, VehiclesModule, LoadsModule],
})
export class FleetModule {}
