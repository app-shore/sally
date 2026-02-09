import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Configuration } from '../../../../config/configuration';
import { ROUTING_PROVIDER } from './routing-provider.interface';
import { OSRMRoutingProvider } from './osrm-routing.provider';
import { HereRoutingProvider } from './here-routing.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ROUTING_PROVIDER,
      useFactory: (configService: ConfigService<Configuration, true>) => {
        const provider = configService.get('routingProvider', { infer: true });

        if (provider === 'here') {
          return new HereRoutingProvider(configService);
        }

        return new OSRMRoutingProvider(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [ROUTING_PROVIDER],
})
export class RoutingProviderModule {}
