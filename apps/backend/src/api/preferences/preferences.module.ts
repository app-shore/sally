import { Module } from '@nestjs/common';
import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [PreferencesController],
  providers: [
    PreferencesService,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [PreferencesService],
})
export class PreferencesModule {}
