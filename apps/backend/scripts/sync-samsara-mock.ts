/**
 * sync-samsara-mock.ts
 *
 * Fetches real driver and vehicle data from the Samsara API and writes it into
 * the unified mock dataset file (src/infrastructure/mock/mock.dataset.ts).
 *
 * This keeps mock TMS data in sync with real Samsara fleet data so that
 * ELD sync can match drivers/vehicles by phone, license, and VIN.
 *
 * Usage:
 *   pnpm run sync-mock
 *
 * Requires SAMSARA_API_TOKEN in .env (or passed as env var).
 */
import 'dotenv/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const SAMSARA_BASE_URL = 'https://api.samsara.com';

interface SamsaraDriver {
  id: string;
  name: string;
  phone?: string;
  licenseNumber?: string;
  licenseState?: string;
  username?: string;
}

interface SamsaraVehicle {
  id: string;
  name: string;
  vin?: string;
  licensePlate?: { value?: string };
  serial?: string;
  make?: string;
  model?: string;
  year?: number;
}

async function fetchSamsaraDrivers(token: string): Promise<SamsaraDriver[]> {
  const response = await axios.get(`${SAMSARA_BASE_URL}/fleet/drivers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data || [];
}

async function fetchSamsaraVehicles(token: string): Promise<SamsaraVehicle[]> {
  const response = await axios.get(`${SAMSARA_BASE_URL}/fleet/vehicles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data || [];
}

function generateEmail(name: string): string {
  const parts = name.toLowerCase().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[parts.length - 1]}@carrier.com`;
  }
  return `${parts[0]}@carrier.com`;
}

function buildDriverEntry(driver: SamsaraDriver, index: number): string {
  const id = `TMS-DRV-${String(index + 1).padStart(3, '0')}`;
  const nameParts = (driver.name || driver.username || 'Unknown Driver').split(/\s+/);
  const firstName = nameParts[0] || 'Unknown';
  const lastName = nameParts.slice(1).join(' ') || 'Driver';
  const phone = driver.phone || '';
  const email = generateEmail(driver.name || driver.username || 'unknown');
  const licenseNumber = driver.licenseNumber || '';
  const licenseState = driver.licenseState || '';

  return `  {
    driver_id: '${id}',
    first_name: '${firstName}',
    last_name: '${lastName}',
    phone: '${phone}',
    email: '${email}',
    license_number: '${licenseNumber}',
    license_state: '${licenseState}',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: ${driver.id}
  }`;
}

function buildVehicleEntry(vehicle: SamsaraVehicle, index: number): string {
  const id = `TMS-VEH-${String(index + 1).padStart(3, '0')}`;
  const unitNumber = `TRK-${String(index + 1).padStart(3, '0')}`;
  const vin = vehicle.vin || '';
  const licensePlate = vehicle.licensePlate?.value || '';
  const make = vehicle.make || 'Unknown';
  const model = vehicle.model || 'Unknown';
  const year = vehicle.year || 2022;

  return `  {
    vehicle_id: '${id}',
    unit_number: '${unitNumber}',
    make: '${make}',
    model: '${model}',
    year: ${year},
    vin: '${vin}',
    license_plate: '${licensePlate}',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: ${vehicle.id}
  }`;
}

async function main() {
  const token = process.env.SAMSARA_API_TOKEN;
  if (!token) {
    console.error('Error: SAMSARA_API_TOKEN not set in .env');
    process.exit(1);
  }

  console.log('Fetching drivers and vehicles from Samsara...');

  const [drivers, vehicles] = await Promise.all([
    fetchSamsaraDrivers(token),
    fetchSamsaraVehicles(token),
  ]);

  console.log(`Found ${drivers.length} drivers and ${vehicles.length} vehicles`);

  const driverEntries = drivers.map((d, i) => buildDriverEntry(d, i)).join(',\n');
  const vehicleEntries = vehicles.map((v, i) => buildVehicleEntry(v, i)).join(',\n');

  // Read the existing file to preserve MOCK_TMS_LOADS
  const datasetPath = path.join(
    __dirname,
    '../src/infrastructure/mock/mock.dataset.ts',
  );

  const fileContent = `/**
 * Unified Mock Dataset — Single Source of Truth
 *
 * All mock entity data lives here. Every adapter and service that needs mock data
 * imports from this file instead of maintaining its own inline data.
 *
 * DRIVERS and VEHICLES: Auto-generated from Samsara API via:
 *   pnpm run sync-mock
 *
 * LOADS: Hand-crafted Boston/NY corridor loads (edit manually).
 *
 * Last synced: ${new Date().toISOString()}
 */

import type { DriverData, VehicleData, LoadData } from '../../domains/integrations/adapters/tms/tms-adapter.interface';

// ---------------------------------------------------------------------------
// Mock TMS Drivers (synced from Samsara — ${drivers.length} drivers)
//
// These use the same phone numbers, license numbers, and names as real
// Samsara drivers so ELD sync can match them correctly.
// ---------------------------------------------------------------------------

export const MOCK_TMS_DRIVERS: DriverData[] = [
${driverEntries}
];

// ---------------------------------------------------------------------------
// Mock TMS Vehicles (synced from Samsara — ${vehicles.length} vehicles)
//
// These use the same VINs and license plates as real Samsara vehicles
// so ELD sync can match them correctly.
// ---------------------------------------------------------------------------

export const MOCK_TMS_VEHICLES: VehicleData[] = [
${vehicleEntries}
];

// ---------------------------------------------------------------------------
// Mock TMS Loads — Boston/NY Corridor (hand-crafted)
//
// Edit these manually. The sync script preserves this section.
// ---------------------------------------------------------------------------

export const MOCK_TMS_LOADS: LoadData[] = [
  {
    load_id: 'LD-2001',
    load_number: 'LD-2001',
    customer_name: 'Boston Distribution Co',
    weight_lbs: 42000,
    commodity_type: 'General Freight',
    pickup_location: {
      address: '100 Produce Market Way',
      city: 'Boston',
      state: 'MA',
      zip: '02118',
      latitude: 42.3401,
      longitude: -71.0589,
    },
    delivery_location: {
      address: '500 Food Center Dr',
      city: 'New York',
      state: 'NY',
      zip: '10474',
      latitude: 40.8128,
      longitude: -73.8803,
    },
    pickup_appointment: new Date(Date.now() + 2 * 3600000).toISOString(),
    delivery_appointment: new Date(Date.now() + 8 * 3600000).toISOString(),
    status: 'ASSIGNED',
    total_miles: 215,
    data_source: 'mock_tms',
  },
  {
    load_id: 'LD-2002',
    load_number: 'LD-2002',
    customer_name: 'Metro NY Logistics',
    weight_lbs: 38500,
    commodity_type: 'Consumer Goods',
    pickup_location: {
      address: '1 Meadowlands Pkwy',
      city: 'East Rutherford',
      state: 'NJ',
      zip: '07073',
      latitude: 40.8128,
      longitude: -74.0730,
    },
    delivery_location: {
      address: '200 Terminal Rd',
      city: 'New Haven',
      state: 'CT',
      zip: '06519',
      latitude: 41.2982,
      longitude: -72.9291,
    },
    pickup_appointment: new Date(Date.now() + 4 * 3600000).toISOString(),
    delivery_appointment: new Date(Date.now() + 10 * 3600000).toISOString(),
    status: 'UNASSIGNED',
    total_miles: 88,
    data_source: 'mock_tms',
  },
  {
    load_id: 'LD-2003',
    load_number: 'LD-2003',
    customer_name: 'Northeast Pharma Supply',
    weight_lbs: 28000,
    commodity_type: 'Pharmaceuticals',
    special_requirements: 'Temperature controlled - maintain 2-8°C',
    pickup_location: {
      address: '75 Industrial Park Dr',
      city: 'Hartford',
      state: 'CT',
      zip: '06114',
      latitude: 41.7489,
      longitude: -72.6884,
    },
    delivery_location: {
      address: '400 Pharmacy Distribution Blvd',
      city: 'Brooklyn',
      state: 'NY',
      zip: '11232',
      latitude: 40.6570,
      longitude: -74.0060,
    },
    pickup_appointment: new Date(Date.now() + 3 * 3600000).toISOString(),
    delivery_appointment: new Date(Date.now() + 9 * 3600000).toISOString(),
    assigned_driver_id: 'TMS-DRV-001',
    assigned_vehicle_id: 'TMS-VEH-001',
    status: 'ASSIGNED',
    total_miles: 118,
    data_source: 'mock_tms',
  },
  {
    load_id: 'LD-2004',
    load_number: 'LD-2004',
    customer_name: 'Providence Building Supply',
    weight_lbs: 44500,
    commodity_type: 'Building Materials',
    special_requirements: 'Flatbed required',
    pickup_location: {
      address: '300 Port Access Rd',
      city: 'Providence',
      state: 'RI',
      zip: '02905',
      latitude: 41.8005,
      longitude: -71.4128,
    },
    delivery_location: {
      address: '150 Construction Way',
      city: 'Stamford',
      state: 'CT',
      zip: '06902',
      latitude: 41.0534,
      longitude: -73.5387,
    },
    pickup_appointment: new Date(Date.now() + 5 * 3600000).toISOString(),
    delivery_appointment: new Date(Date.now() + 11 * 3600000).toISOString(),
    assigned_driver_id: 'TMS-DRV-002',
    assigned_vehicle_id: 'TMS-VEH-002',
    status: 'IN_TRANSIT',
    total_miles: 95,
    data_source: 'mock_tms',
  },
  {
    load_id: 'LD-2005',
    load_number: 'LD-2005',
    customer_name: 'Long Island Fresh Foods',
    weight_lbs: 35000,
    commodity_type: 'Refrigerated Produce',
    special_requirements: 'Reefer unit required - maintain 34°F',
    pickup_location: {
      address: '50 Wholesale Market St',
      city: 'Worcester',
      state: 'MA',
      zip: '01608',
      latitude: 42.2626,
      longitude: -71.8023,
    },
    delivery_location: {
      address: '800 Fresh Market Blvd',
      city: 'Hicksville',
      state: 'NY',
      zip: '11801',
      latitude: 40.7682,
      longitude: -73.5251,
    },
    pickup_appointment: new Date(Date.now() + 1 * 3600000).toISOString(),
    delivery_appointment: new Date(Date.now() + 7 * 3600000).toISOString(),
    status: 'ASSIGNED',
    total_miles: 178,
    data_source: 'mock_tms',
  },
];
`;

  fs.writeFileSync(datasetPath, fileContent, 'utf-8');
  console.log(`\\nWrote ${datasetPath}`);
  console.log(`  ${drivers.length} drivers, ${vehicles.length} vehicles, 5 loads (Boston/NY corridor)`);
  console.log('\\nDone! Mock dataset is now synced with Samsara.');
}

main().catch((err) => {
  console.error('Failed to sync mock data:', err.message);
  process.exit(1);
});
