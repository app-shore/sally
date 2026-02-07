import { Injectable, Logger } from '@nestjs/common';
import { AlertGenerationService } from './alert-generation.service';
import { ALERT_TYPES } from '../alert-types';

@Injectable()
export class AlertTriggersService {
  private readonly logger = new Logger(AlertTriggersService.name);

  constructor(private readonly alertGen: AlertGenerationService) {}

  async trigger(
    alertType: string,
    tenantId: number,
    driverId: string,
    params: Record<string, any> = {},
  ) {
    const definition = ALERT_TYPES[alertType];
    if (!definition) {
      this.logger.warn(`Unknown alert type: ${alertType}`);
      return null;
    }

    return this.alertGen.generateAlert({
      tenantId,
      driverId,
      routePlanId: params.routePlanId,
      vehicleId: params.vehicleId,
      alertType: definition.type,
      category: definition.category,
      priority: params.priority || definition.defaultPriority,
      title: definition.title(params),
      message: definition.message(params),
      recommendedAction: definition.recommendedAction(params),
      metadata: params,
    });
  }
}
