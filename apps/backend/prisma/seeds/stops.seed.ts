import { PrismaClient } from '@prisma/client';

interface StopSeed {
  stopId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  locationType: string;
}

export async function seedStops(prisma: PrismaClient) {
  console.log('🔄 Seeding stops...');

  const stopsData: StopSeed[] = [
    // Warehouses
    {
      stopId: 'STOP-WH-001',
      name: 'Chicago Distribution Center',
      address: '1000 W Distribution Dr',
      city: 'Chicago',
      state: 'IL',
      lat: 41.8781,
      lon: -87.6298,
      locationType: 'warehouse',
    },
    {
      stopId: 'STOP-WH-002',
      name: 'Los Angeles Warehouse',
      address: '2000 E Warehouse Blvd',
      city: 'Los Angeles',
      state: 'CA',
      lat: 34.0522,
      lon: -118.2437,
      locationType: 'warehouse',
    },
    {
      stopId: 'STOP-WH-003',
      name: 'Phoenix Distribution',
      address: '500 S Industrial Pkwy',
      city: 'Phoenix',
      state: 'AZ',
      lat: 33.4484,
      lon: -112.074,
      locationType: 'warehouse',
    },

    // Customer locations
    {
      stopId: 'STOP-CUS-001',
      name: 'Indianapolis Customer - XYZ Inc',
      address: '200 Commerce Ave',
      city: 'Indianapolis',
      state: 'IN',
      lat: 39.7684,
      lon: -86.158,
      locationType: 'customer',
    },
    {
      stopId: 'STOP-CUS-002',
      name: 'Dallas Customer - ABC Corp',
      address: '300 Industrial Blvd',
      city: 'Dallas',
      state: 'TX',
      lat: 32.7767,
      lon: -96.797,
      locationType: 'customer',
    },

    // Truck stops
    {
      stopId: 'STOP-TS-005',
      name: 'Tucson Truck Stop',
      address: 'I-10 Exit 198',
      city: 'Tucson',
      state: 'AZ',
      lat: 32.2217,
      lon: -110.9265,
      locationType: 'truck_stop',
    },
  ];

  for (const stopData of stopsData) {
    await prisma.stop.upsert({
      where: { stopId: stopData.stopId },
      create: {
        ...stopData,
        isActive: true,
      },
      update: {
        ...stopData,
      },
    });
  }

  console.log('   ✅ Stops seeded successfully (6 stops)');
}
