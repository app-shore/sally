/**
 * cleanup-for-testing.ts
 *
 * Deletes all TMS-synced entities and associated data (route plans, alerts,
 * settlements, invoices, etc.) so you can re-run integration sync cleanly.
 *
 * Preserved: tenants, users, customers, stops (truck stop reference data),
 * feature_flags, integration_configs (credentials kept, timestamps reset),
 * reference_data, fleet_operations_settings, alert_configurations.
 *
 * Usage:
 *   pnpm run db:cleanup                     # interactive prompt
 *   pnpm run db:cleanup -- --confirm        # skip prompt
 *   pnpm run db:cleanup -- --tenant 1       # scope to tenant id=1
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// ---------------------------------------------------------------------------
// CLI Argument Parsing
// ---------------------------------------------------------------------------

function parseArgs(): { tenantId: number | null; confirm: boolean } {
  const args = process.argv.slice(2);
  let tenantId: number | null = null;
  let confirm = false;

  const tenantIdx = args.indexOf('--tenant');
  if (tenantIdx !== -1 && args[tenantIdx + 1]) {
    tenantId = parseInt(args[tenantIdx + 1], 10);
    if (isNaN(tenantId)) {
      console.error('  Error: --tenant value must be a number');
      process.exit(1);
    }
  }

  if (args.includes('--confirm')) {
    confirm = true;
  }

  return { tenantId, confirm };
}

// ---------------------------------------------------------------------------
// Interactive Prompt
// ---------------------------------------------------------------------------

async function promptConfirmation(tenantId: number | null): Promise<boolean> {
  const scope = tenantId ? `tenant ${tenantId}` : 'ALL tenants';
  const message = `\n  ⚠️  This will delete all synced data for ${scope}.\n  Type "yes" to continue: `;

  return new Promise((resolve) => {
    process.stdout.write(message);
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', (data: string) => {
      resolve(data.trim().toLowerCase() === 'yes');
    });
  });
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

interface DeleteResult {
  table: string;
  count: number;
}

async function cleanup(
  prisma: PrismaClient,
  tenantId: number | null,
): Promise<DeleteResult[]> {
  const results: DeleteResult[] = [];
  const where = tenantId ? { tenantId } : {};

  // Helper to delete and track count
  async function del(table: string, deletePromise: Promise<{ count: number }>) {
    const { count } = await deletePromise;
    results.push({ table, count });
  }

  await prisma.$transaction(async (tx) => {
    // -----------------------------------------------------------------------
    // Phase 1 — Leaf tables (no dependents)
    // -----------------------------------------------------------------------

    await del('integration_sync_logs', tx.integrationSyncLog.deleteMany({
      where: tenantId
        ? { integration: { tenantId } }
        : {},
    }));

    await del('alert_notes', tx.alertNote.deleteMany({
      where: tenantId
        ? { alert: { tenantId } }
        : {},
    }));

    await del('alerts', tx.alert.deleteMany({ where }));

    await del('notifications', tx.notification.deleteMany({
      where: tenantId
        ? { tenantId }
        : {},
    }));

    await del('shift_notes', tx.shiftNote.deleteMany({ where }));

    // -----------------------------------------------------------------------
    // Phase 2 — Conversations
    // -----------------------------------------------------------------------

    await del('conversation_messages', tx.conversationMessage.deleteMany({
      where: tenantId
        ? { conversation: { tenantId } }
        : {},
    }));

    await del('conversations', tx.conversation.deleteMany({ where }));

    // -----------------------------------------------------------------------
    // Phase 3 — Route planning chain
    // -----------------------------------------------------------------------

    await del('route_events', tx.routeEvent.deleteMany({
      where: tenantId
        ? { plan: { tenantId } }
        : {},
    }));

    await del('route_plan_loads', tx.routePlanLoad.deleteMany({
      where: tenantId
        ? { plan: { tenantId } }
        : {},
    }));

    await del('route_segments', tx.routeSegment.deleteMany({
      where: tenantId
        ? { plan: { tenantId } }
        : {},
    }));

    await del('route_plans', tx.routePlan.deleteMany({ where }));

    // -----------------------------------------------------------------------
    // Phase 4 — Money module
    // -----------------------------------------------------------------------

    await del('settlement_deductions', tx.settlementDeduction.deleteMany({
      where: tenantId
        ? { settlement: { tenantId } }
        : {},
    }));

    await del('settlement_line_items', tx.settlementLineItem.deleteMany({
      where: tenantId
        ? { settlement: { tenantId } }
        : {},
    }));

    await del('settlements', tx.settlement.deleteMany({ where }));

    await del('invoice_line_items', tx.invoiceLineItem.deleteMany({
      where: tenantId
        ? { invoice: { tenantId } }
        : {},
    }));

    await del('payments', tx.payment.deleteMany({ where }));

    await del('invoices', tx.invoice.deleteMany({ where }));

    await del('driver_pay_structures', tx.driverPayStructure.deleteMany({ where }));

    // -----------------------------------------------------------------------
    // Phase 5 — Load data
    // -----------------------------------------------------------------------

    await del('load_stops', tx.loadStop.deleteMany({
      where: tenantId
        ? { load: { tenantId } }
        : {},
    }));

    await del('loads', tx.load.deleteMany({ where }));

    // -----------------------------------------------------------------------
    // Phase 6 — Core entities
    // -----------------------------------------------------------------------

    await del('vehicle_telematics', tx.vehicleTelematics.deleteMany({ where }));

    await del('driver_preferences', tx.driverPreferences.deleteMany({
      where: tenantId
        ? { driver: { tenantId } }
        : {},
    }));

    // Null out driver links on users before deleting drivers
    await tx.user.updateMany({
      where: tenantId
        ? { tenantId, driverId: { not: null } }
        : { driverId: { not: null } },
      data: { driverId: null },
    });

    // Null out driver links on invitations before deleting drivers
    await tx.userInvitation.updateMany({
      where: tenantId
        ? { tenantId, driverId: { not: null } }
        : { driverId: { not: null } },
      data: { driverId: null },
    });

    await del('vehicles', tx.vehicle.deleteMany({ where }));

    await del('drivers', tx.driver.deleteMany({ where }));

    // -----------------------------------------------------------------------
    // Phase 7 — Reset integration config timestamps
    // -----------------------------------------------------------------------

    const integrationUpdate = await tx.integrationConfig.updateMany({
      where: tenantId ? { tenantId } : {},
      data: {
        lastSyncAt: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastErrorMessage: null,
      },
    });
    results.push({ table: 'integration_configs (reset)', count: integrationUpdate.count });
  }, { timeout: 60000 });

  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { tenantId, confirm } = parseArgs();

  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://sally_user:sally_password@localhost:5432/sally';
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const scope = tenantId ? `tenant ${tenantId}` : 'all tenants';
    console.log('');
    console.log('  SALLY — Cleanup for Testing');
    console.log(`  Scope: ${scope}`);

    if (!confirm) {
      const allowed = await promptConfirmation(tenantId);
      if (!allowed) {
        console.log('  Aborted.\n');
        return;
      }
    }

    console.log('');
    console.log('  Deleting synced data...');
    console.log('');

    const results = await cleanup(prisma, tenantId);

    // Print summary
    console.log('  Table                        Deleted');
    console.log('  ─────────────────────────────  ───────');
    let totalDeleted = 0;
    for (const { table, count } of results) {
      console.log(`  ${table.padEnd(30)} ${count}`);
      totalDeleted += count;
    }
    console.log('  ─────────────────────────────  ───────');
    console.log(`  ${'Total'.padEnd(30)} ${totalDeleted}`);
    console.log('');
    console.log('  Cleanup complete. Run integration sync to re-populate.');
    console.log('');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('\n  Cleanup failed:', error.message);
  process.exit(1);
});
