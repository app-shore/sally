import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        if (!redisUrl) {
          // Fallback to in-memory cache if Redis URL not configured
          return {
            ttl: 300, // 5 minutes default TTL
            max: 100, // max items in cache
          };
        }

        const store = await redisStore({
          url: redisUrl,
          ttl: 300, // 5 minutes default TTL
        });

        return {
          store,
          ttl: 300,
          max: 100,
        };
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
