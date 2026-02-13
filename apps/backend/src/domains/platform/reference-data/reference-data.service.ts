import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

interface ReferenceItem {
  code: string;
  label: string;
  sort_order: number;
  metadata: any;
}

type ReferenceDataMap = Record<string, ReferenceItem[]>;

@Injectable()
export class ReferenceDataService {
  private readonly logger = new Logger(ReferenceDataService.name);
  private cache: ReferenceDataMap | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  async getByCategories(categories?: string[]): Promise<ReferenceDataMap> {
    const allData = await this.getAllCached();

    if (!categories || categories.length === 0) {
      return allData;
    }

    const filtered: ReferenceDataMap = {};
    for (const cat of categories) {
      if (allData[cat]) {
        filtered[cat] = allData[cat];
      }
    }
    return filtered;
  }

  private async getAllCached(): Promise<ReferenceDataMap> {
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache;
    }

    this.logger.log('Refreshing reference data cache');

    const rows = await this.prisma.referenceData.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    const grouped: ReferenceDataMap = {};
    for (const row of rows) {
      if (!grouped[row.category]) {
        grouped[row.category] = [];
      }
      grouped[row.category].push({
        code: row.code,
        label: row.label,
        sort_order: row.sortOrder,
        metadata: row.metadata || {},
      });
    }

    this.cache = grouped;
    this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;

    return grouped;
  }
}
