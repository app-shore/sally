import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://sally_user:sally_password@localhost:5432/sally';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedFeatureFlags() {
  console.log('🚩 Seeding feature flags...');

  const flags = [
    // Dispatcher features
    {
      key: 'route_planning_enabled',
      name: 'Route Planning',
      description: 'Intelligent route planning with HOS compliance and automatic rest/fuel stop insertion',
      enabled: false,
      category: 'dispatcher',
    },
    {
      key: 'live_tracking_enabled',
      name: 'Live Route Tracking',
      description: 'Real-time monitoring of active routes with progress tracking and status updates',
      enabled: false,
      category: 'dispatcher',
    },
    {
      key: 'command_center_enabled',
      name: 'Dispatcher Command Center',
      description: 'Mission control dashboard with fleet overview, quick actions, and activity feed',
      enabled: false,
      category: 'dispatcher',
    },

    // Driver features
    {
      key: 'driver_dashboard_enabled',
      name: 'Driver Dashboard',
      description: 'Driver portal with route overview and HOS compliance tracking',
      enabled: false,
      category: 'driver',
    },
    {
      key: 'driver_current_route_enabled',
      name: 'Driver Current Route View',
      description: 'Real-time route timeline with stop-by-stop guidance and HOS status',
      enabled: false,
      category: 'driver',
    },
    {
      key: 'driver_messages_enabled',
      name: 'Driver Messages',
      description: 'Communication channel for dispatch messages and route updates',
      enabled: false,
      category: 'driver',
    },

    // System features
    {
      key: 'alerts_system_enabled',
      name: 'Automated Alert System',
      description: 'Proactive dispatcher notifications for HOS, delays, and critical events',
      enabled: false,
      category: 'dispatcher',
    },
    {
      key: 'continuous_monitoring_enabled',
      name: 'Continuous Monitoring',
      description: 'Background service monitoring 14 trigger types every 60 seconds',
      enabled: false,
      category: 'dispatcher',
    },

    // Integration features
    {
      key: 'external_integrations_enabled',
      name: 'External Integrations',
      description: 'Connect to Samsara ELD, TMS, fuel price APIs, and weather services',
      enabled: false,
      category: 'admin',
    },

    // Fleet management
    {
      key: 'fleet_management_enabled',
      name: 'Fleet Management',
      description: 'CRUD interface for managing drivers, vehicles, and fleet settings',
      enabled: false,
      category: 'admin',
    },

    // Financials (Phase 1)
    {
      key: 'invoicing_enabled',
      name: 'Invoicing',
      description: 'Create, send, and track invoices for completed loads with automatic rate calculation',
      enabled: false,
      category: 'dispatcher',
    },
    {
      key: 'driver_settlements_enabled',
      name: 'Driver Settlements',
      description: 'Calculate and manage driver pay with per-mile, percentage, and flat rate support',
      enabled: false,
      category: 'dispatcher',
    },
    {
      key: 'quickbooks_integration_enabled',
      name: 'QuickBooks Integration',
      description: 'Sync invoices and settlements to QuickBooks for seamless accounting',
      enabled: false,
      category: 'admin',
    },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    });
  }

  console.log(`✅ Created/updated ${flags.length} feature flags`);
}

// Run if called directly
if (require.main === module) {
  seedFeatureFlags()
    .then(() => {
      console.log('✅ Feature flags seed complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Feature flags seed failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
      pool.end();
    });
}
