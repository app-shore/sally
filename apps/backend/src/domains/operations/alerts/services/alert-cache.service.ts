import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AlertCacheService {
  private readonly logger = new Logger(AlertCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.cacheManager.get<T>(key);
    return value ?? null;
  }

  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    await this.cacheManager.set(key, data, ttlSeconds * 1000);
  }

  async invalidate(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }
}
