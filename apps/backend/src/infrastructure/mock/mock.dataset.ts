/**
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
 * Last synced: 2026-02-15T06:59:04.846Z
 */

import type { DriverData, VehicleData, LoadData } from '../../domains/integrations/adapters/tms/tms-adapter.interface';

// ---------------------------------------------------------------------------
// Mock TMS Drivers (synced from Samsara — 19 drivers)
//
// These use the same phone numbers, license numbers, and names as real
// Samsara drivers so ELD sync can match them correctly.
// ---------------------------------------------------------------------------

export const MOCK_TMS_DRIVERS: DriverData[] = [
  {
    driver_id: 'TMS-DRV-001',
    first_name: 'Heideckel',
    last_name: 'Toribo ( Oscar)',
    phone: '9788856169',
    email: 'heideckel.oscar)@carrier.com',
    license_number: 'NHL14227039',
    license_state: 'NH',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 53207939
  },
  {
    driver_id: 'TMS-DRV-002',
    first_name: 'Deepak',
    last_name: 'NFN',
    phone: '3477654208',
    email: 'deepak.nfn@carrier.com',
    license_number: '149147333',
    license_state: 'NY',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 53208817
  },
  {
    driver_id: 'TMS-DRV-003',
    first_name: 'James',
    last_name: 'Austin',
    phone: '3393644162',
    email: 'james.austin@carrier.com',
    license_number: 'S62067934',
    license_state: 'MA',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 53211426
  },
  {
    driver_id: 'TMS-DRV-004',
    first_name: 'Eric',
    last_name: 'Driver',
    phone: '9786050448',
    email: 'eric@carrier.com',
    license_number: 'S10910231',
    license_state: 'MA',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 53250543
  },
  {
    driver_id: 'TMS-DRV-005',
    first_name: 'NUNEZ',
    last_name: 'ROBERT',
    phone: '19783059716',
    email: 'nunez.robert@carrier.com',
    license_number: 'S06599536',
    license_state: 'MA',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 53708172
  },
  {
    driver_id: 'TMS-DRV-006',
    first_name: 'Camaron',
    last_name: 'Donald Edeard',
    phone: '16178325411',
    email: 'camaron.edeard@carrier.com',
    license_number: 'S55592723',
    license_state: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 53759537
  },
  {
    driver_id: 'TMS-DRV-007',
    first_name: 'Antoine',
    last_name: 'R',
    phone: '9082205786',
    email: 'antoine.r@carrier.com',
    license_number: 'NHL11816663',
    license_state: 'NH',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 53761629
  },
  {
    driver_id: 'TMS-DRV-008',
    first_name: 'Manveer',
    last_name: 'Driver',
    phone: '4752069690',
    email: 'manveer@carrier.com',
    license_number: '199414960',
    license_state: 'MA',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 53878141
  },
  {
    driver_id: 'TMS-DRV-009',
    first_name: 'Ahamed',
    last_name: 'Mohamed Faizal',
    phone: '',
    email: 'ahamed.faizal@carrier.com',
    license_number: 'S67168726',
    license_state: 'MA',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 53958253
  },
  {
    driver_id: 'TMS-DRV-010',
    first_name: 'Hector',
    last_name: 'Joel Batista',
    phone: '9783139100',
    email: 'hector.batista@carrier.com',
    license_number: 'SA0180947',
    license_state: 'MA',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 54172938
  },
  {
    driver_id: 'TMS-DRV-011',
    first_name: 'David',
    last_name: 'Arden',
    phone: '2038415054',
    email: 'david.arden@carrier.com',
    license_number: '108736005',
    license_state: 'CT',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 54290438
  },
  {
    driver_id: 'TMS-DRV-012',
    first_name: 'Dhozhi',
    last_name: 'Rei',
    phone: '7815210573',
    email: 'dhozhi.rei@carrier.com',
    license_number: 'SA8640372',
    license_state: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 54561137
  },
  {
    driver_id: 'TMS-DRV-013',
    first_name: 'Winder',
    last_name: 'Joshua James, JR',
    phone: '',
    email: 'winder.jr@carrier.com',
    license_number: '129251687',
    license_state: 'CT',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 54624756
  },
  {
    driver_id: 'TMS-DRV-014',
    first_name: 'JAY',
    last_name: 'Driver',
    phone: '3392081659',
    email: 'jay@carrier.com',
    license_number: '123',
    license_state: 'MA',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 54980150
  },
  {
    driver_id: 'TMS-DRV-015',
    first_name: 'Anand',
    last_name: 'Rituraj',
    phone: '',
    email: 'anand.rituraj@carrier.com',
    license_number: '',
    license_state: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 55058900
  },
  {
    driver_id: 'TMS-DRV-016',
    first_name: 'Brinder',
    last_name: 'Singh',
    phone: '19296230454',
    email: 'brinder.singh@carrier.com',
    license_number: '440586911',
    license_state: 'NY',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 55163240
  },
  {
    driver_id: 'TMS-DRV-017',
    first_name: 'Michael',
    last_name: 'Driver',
    phone: '14753844854',
    email: 'michael@carrier.com',
    license_number: '178339822',
    license_state: 'CT',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 55257455
  },
  {
    driver_id: 'TMS-DRV-018',
    first_name: 'Fresly',
    last_name: 'Driver',
    phone: '',
    email: 'fresly@carrier.com',
    license_number: '',
    license_state: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 55369119
  },
  {
    driver_id: 'TMS-DRV-019',
    first_name: 'Dinero',
    last_name: 'Driver',
    phone: '',
    email: 'dinero@carrier.com',
    license_number: '',
    license_state: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 55430354
  }
];

// ---------------------------------------------------------------------------
// Mock TMS Vehicles (synced from Samsara — 20 vehicles)
//
// These use the same VINs and license plates as real Samsara vehicles
// so ELD sync can match them correctly.
// ---------------------------------------------------------------------------

export const MOCK_TMS_VEHICLES: VehicleData[] = [
  {
    vehicle_id: 'TMS-VEH-001',
    unit_number: 'TRK-001',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2018,
    vin: '1FUJGHDV9JLJY8062',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387574
  },
  {
    vehicle_id: 'TMS-VEH-002',
    unit_number: 'TRK-002',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2019,
    vin: '3AKJHPDV2KSKA4482',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387575
  },
  {
    vehicle_id: 'TMS-VEH-003',
    unit_number: 'TRK-003',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2019,
    vin: '3AKJHPDV8KSKF9518',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387576
  },
  {
    vehicle_id: 'TMS-VEH-004',
    unit_number: 'TRK-004',
    make: 'VOLVO TRUCK',
    model: 'VNL',
    year: 2016,
    vin: '4V4NC9EHXGN946995',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387577
  },
  {
    vehicle_id: 'TMS-VEH-005',
    unit_number: 'TRK-005',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2018,
    vin: '1FUJGHDV8JLJY8070',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387578
  },
  {
    vehicle_id: 'TMS-VEH-006',
    unit_number: 'TRK-006',
    make: 'VOLVO TRUCK',
    model: 'VNL',
    year: 2018,
    vin: '4V4NC9EH9JN996004',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387579
  },
  {
    vehicle_id: 'TMS-VEH-007',
    unit_number: 'TRK-007',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2020,
    vin: '3AKJHPDV6LSLG8996',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387580
  },
  {
    vehicle_id: 'TMS-VEH-008',
    unit_number: 'TRK-008',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2013,
    vin: '3AKJGLDV3DSFF7928',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387581
  },
  {
    vehicle_id: 'TMS-VEH-009',
    unit_number: 'TRK-009',
    make: 'VOLVO TRUCK',
    model: 'VNL',
    year: 2017,
    vin: '4V4NC9EH2HN978972',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387582
  },
  {
    vehicle_id: 'TMS-VEH-010',
    unit_number: 'TRK-010',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2018,
    vin: '1FUJGHDV7JLJY8061',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387584
  },
  {
    vehicle_id: 'TMS-VEH-011',
    unit_number: 'TRK-011',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2020,
    vin: '3AKJHPDV1LSLF0275',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387585
  },
  {
    vehicle_id: 'TMS-VEH-012',
    unit_number: 'TRK-012',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2019,
    vin: '3AKJHHDR3KSKD1196',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387586
  },
  {
    vehicle_id: 'TMS-VEH-013',
    unit_number: 'TRK-013',
    make: 'VOLVO TRUCK',
    model: 'VNL',
    year: 2017,
    vin: '4V4NC9EH0HN979036',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387600
  },
  {
    vehicle_id: 'TMS-VEH-014',
    unit_number: 'TRK-014',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2018,
    vin: '1FUJGLDV3JLJY8030',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996387601
  },
  {
    vehicle_id: 'TMS-VEH-015',
    unit_number: 'TRK-015',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2018,
    vin: '1FUJGHDV8JLJY8070',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474996685865
  },
  {
    vehicle_id: 'TMS-VEH-016',
    unit_number: 'TRK-016',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2018,
    vin: '1FUJGLDV8JLJY8024',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474998591916
  },
  {
    vehicle_id: 'TMS-VEH-017',
    unit_number: 'TRK-017',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2018,
    vin: '1FUJGHDVXJLJY8071',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474998647326
  },
  {
    vehicle_id: 'TMS-VEH-018',
    unit_number: 'TRK-018',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2018,
    vin: '1FUJGLDV1JLKC7015',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281474998739425
  },
  {
    vehicle_id: 'TMS-VEH-019',
    unit_number: 'TRK-019',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2018,
    vin: '1FUJGLDV2JLKC6973',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281475000143401
  },
  {
    vehicle_id: 'TMS-VEH-020',
    unit_number: 'TRK-020',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2018,
    vin: '1FUJGLDV8JLKC6976',
    license_plate: '',
    status: 'ACTIVE' as const,
    data_source: 'mock_tms',
    // Samsara ID: 281475000143402
  }
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
