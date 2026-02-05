import { Module } from '@nestjs/common';
import { PredictionController } from './controllers/prediction.controller';
import { PredictionEngineService } from './services/prediction-engine.service';

@Module({
  controllers: [PredictionController],
  providers: [PredictionEngineService],
  exports: [PredictionEngineService],
})
export class PredictionModule {}
