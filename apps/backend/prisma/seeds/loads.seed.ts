import { PrismaClient } from '@prisma/client';

interface LoadStopSeed {
  stopId: string;
  seq: number;
  action: string;
  earliest?: string;
  latest?: string;
  dock: number;
}

interface LoadSeed {
  loadId: string;
  loadNumber: string;
  status: string;
  weightLbs: number;
  commodityType: string;
  specialRequirements?: string;
  customerName: string;
  externalLoadId: string;
  externalSource: string;
  stops: LoadStopSeed[];
}

export async function seedLoads(prisma: PrismaClient) {
  console.log('🔄 Seeding loads...');

  const loadsData: LoadSeed[] = [
    {
      loadId: 'LOAD-001',
      loadNumber: 'WMT-45892',
      status: 'pending',
      weightLbs: 44500.0,
      commodityType: 'general',
      specialRequirements: 'Delivery appointment required - call 24h ahead',
      customerName: 'Walmart Distribution',
      externalLoadId: 'TMS-WMT-45892',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-WH-001', seq: 1, action: 'pickup', earliest: '06:00', latest: '10:00', dock: 1.5 },
        { stopId: 'STOP-CUS-002', seq: 2, action: 'delivery', earliest: '14:00', latest: '18:00', dock: 2.0 },
      ],
    },
    {
      loadId: 'LOAD-002',
      loadNumber: 'TGT-12034',
      status: 'pending',
      weightLbs: 42000.0,
      commodityType: 'refrigerated',
      specialRequirements: 'Maintain 38°F - reefer unit required',
      customerName: 'Target Logistics',
      externalLoadId: 'TMS-TGT-12034',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-WH-002', seq: 1, action: 'pickup', earliest: '07:00', latest: '12:00', dock: 2.5 },
        { stopId: 'STOP-WH-003', seq: 2, action: 'delivery', earliest: '06:00', latest: '16:00', dock: 1.5 },
        { stopId: 'STOP-TS-005', seq: 3, action: 'delivery', earliest: '08:00', latest: '18:00', dock: 1.0 },
      ],
    },
    {
      loadId: 'LOAD-003',
      loadNumber: 'FDX-78234',
      status: 'pending',
      weightLbs: 28000.0,
      commodityType: 'general',
      specialRequirements: 'Liftgate required at final stop',
      customerName: 'FedEx Freight',
      externalLoadId: 'TMS-FDX-78234',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-WH-001', seq: 1, action: 'pickup', earliest: '05:00', latest: '09:00', dock: 1.0 },
        { stopId: 'STOP-CUS-002', seq: 2, action: 'delivery', dock: 0.5 },
        { stopId: 'STOP-CUS-001', seq: 3, action: 'delivery', earliest: '07:00', latest: '17:00', dock: 0.75 },
      ],
    },
    {
      loadId: 'LOAD-004',
      loadNumber: 'AMZ-99201',
      status: 'pending',
      weightLbs: 38750.0,
      commodityType: 'general',
      specialRequirements: 'Must deliver by 10 AM - No weekend delivery',
      customerName: 'Amazon Fulfillment',
      externalLoadId: 'TMS-AMZ-99201',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-WH-002', seq: 1, action: 'pickup', earliest: '18:00', latest: '22:00', dock: 1.25 },
        { stopId: 'STOP-WH-003', seq: 2, action: 'delivery', earliest: '06:00', latest: '10:00', dock: 1.5 },
      ],
    },
    {
      loadId: 'LOAD-005',
      loadNumber: 'CAT-55612',
      status: 'pending',
      weightLbs: 47900.0,
      commodityType: 'fragile',
      specialRequirements: 'Flatbed required - Tarps provided - Oversize permits needed',
      customerName: 'Caterpillar Equipment',
      externalLoadId: 'TMS-CAT-55612',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-CUS-002', seq: 1, action: 'pickup', earliest: '08:00', latest: '14:00', dock: 3.0 },
        { stopId: 'STOP-CUS-001', seq: 2, action: 'delivery', earliest: '07:00', latest: '16:00', dock: 2.5 },
      ],
    },
    {
      loadId: 'LOAD-006',
      loadNumber: 'CVS-44023',
      status: 'pending',
      weightLbs: 12500.0,
      commodityType: 'refrigerated',
      specialRequirements: 'Temperature monitoring required - High value cargo - Team driver preferred',
      customerName: 'CVS Health Supply',
      externalLoadId: 'TMS-CVS-44023',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-CUS-001', seq: 1, action: 'pickup', earliest: '06:00', latest: '10:00', dock: 1.5 },
        { stopId: 'STOP-WH-001', seq: 2, action: 'delivery', earliest: '08:00', latest: '18:00', dock: 1.0 },
      ],
    },
    {
      loadId: 'LOAD-007',
      loadNumber: 'HD-88451',
      status: 'pending',
      weightLbs: 45800.0,
      commodityType: 'general',
      specialRequirements: 'Flatbed - Secure tarps - Multiple pickup locations',
      customerName: 'Home Depot Distribution',
      externalLoadId: 'TMS-HD-88451',
      externalSource: 'truckbase_tms',
      stops: [
        { stopId: 'STOP-WH-001', seq: 1, action: 'pickup', earliest: '06:00', latest: '12:00', dock: 2.0 },
        { stopId: 'STOP-CUS-002', seq: 2, action: 'pickup', dock: 1.5 },
        { stopId: 'STOP-WH-003', seq: 3, action: 'delivery', earliest: '08:00', latest: '18:00', dock: 2.5 },
      ],
    },
  ];

  for (const loadData of loadsData) {
    const { stops, ...loadFields } = loadData;

    // Upsert load
    const load = await prisma.load.upsert({
      where: { loadId: loadFields.loadId },
      create: {
        ...loadFields,
        isActive: true,
        lastSyncedAt: new Date(),
      },
      update: {
        ...loadFields,
        lastSyncedAt: new Date(),
      },
    });

    // Delete existing stops and recreate (idempotent)
    await prisma.loadStop.deleteMany({ where: { loadId: load.id } });

    // Create load stops
    for (const stopData of stops) {
      const stop = await prisma.stop.findFirst({
        where: { stopId: stopData.stopId },
      });

      if (stop) {
        await prisma.loadStop.create({
          data: {
            loadId: load.id,
            stopId: stop.id,
            sequenceOrder: stopData.seq,
            actionType: stopData.action,
            earliestArrival: stopData.earliest || null,
            latestArrival: stopData.latest || null,
            estimatedDockHours: stopData.dock,
          },
        });
      } else {
        console.warn(`   ⚠️  Stop ${stopData.stopId} not found, skipping for load ${loadFields.loadId}`);
      }
    }
  }

  console.log('   ✅ Loads seeded successfully (7 loads)');
}
