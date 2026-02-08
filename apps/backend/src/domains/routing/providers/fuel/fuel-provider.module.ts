import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../../infrastructure/database/prisma.module';
import { FUEL_DATA_PROVIDER } from './fuel-data-provider.interface';
import { DatabaseFuelProvider } from './database-fuel.provider';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: FUEL_DATA_PROVIDER,
      useClass: DatabaseFuelProvider,
    },
  ],
  exports: [FUEL_DATA_PROVIDER],
})
export class FuelProviderModule {}
