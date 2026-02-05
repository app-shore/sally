/**
 * Mock TMS (Project44) data that matches Samsara ELD data structure
 * These VINs, license plates, phones, and license numbers align with actual
 * Samsara test data to enable integration testing.
 */

export const MOCK_TMS_VEHICLES = [
  {
    id: 'TMS-V001',
    vehicleId: 'VEH-001',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2018,
    vin: '1FUJGHDV9JLJY8062',
    licensePlate: 'TX R70-1836',
    status: 'ACTIVE',
    capacity: 45000,
  },
  {
    id: 'TMS-V002',
    vehicleId: 'VEH-002',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2019,
    vin: '3AKJHPDV2KSKA4482',
    licensePlate: '',
    status: 'ACTIVE',
    capacity: 45000,
  },
  {
    id: 'TMS-V003',
    vehicleId: 'VEH-003',
    make: 'VOLVO TRUCK',
    model: 'VNL',
    year: 2017,
    vin: '4V4NC9EH0HN979036',
    licensePlate: '',
    status: 'ACTIVE',
    capacity: 45000,
  },
];

export const MOCK_TMS_DRIVERS = [
  {
    id: 'TMS-D001',
    driverId: 'DRV-001',
    name: 'Heideckel Toribo',
    phone: '+19788856169',
    email: 'oscar@example.com',
    licenseNumber: 'NHL14227039',
    licenseState: 'NH',
    status: 'ACTIVE',
  },
  {
    id: 'TMS-D002',
    driverId: 'DRV-002',
    name: 'Deepak NFN',
    phone: '+13477654208',
    email: 'deepak@example.com',
    licenseNumber: '149147333',
    licenseState: 'NY',
    status: 'ACTIVE',
  },
  {
    id: 'TMS-D003',
    driverId: 'DRV-003',
    name: 'James Austin',
    phone: '+13393644162',
    email: 'james@example.com',
    licenseNumber: 'S62067934',
    licenseState: 'MA',
    status: 'ACTIVE',
  },
  {
    id: 'TMS-D004',
    driverId: 'DRV-004',
    name: 'Brinder Singh',
    phone: '+19296230454',
    email: 'brinder@example.com',
    licenseNumber: '440586911',
    licenseState: 'NY',
    status: 'ACTIVE',
  },
];
