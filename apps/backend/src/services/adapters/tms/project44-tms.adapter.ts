import { ITMSAdapter, LoadData } from './tms-adapter.interface';

/**
 * Driver data from project44 TMS
 */
export interface DriverData {
  driver_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  license_number?: string;
  license_state?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_DUTY' | 'OFF_DUTY';
  current_location?: {
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
  };
  assigned_vehicle_id?: string;
  data_source: string;
}

/**
 * Vehicle data from project44 TMS
 */
export interface VehicleData {
  vehicle_id: string;
  unit_number: string;
  make: string;
  model: string;
  year: number;
  vin?: string;
  license_plate?: string;
  license_state?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'IN_SERVICE' | 'OUT_OF_SERVICE';
  current_location?: {
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
  };
  assigned_driver_id?: string;
  data_source: string;
}

/**
 * project44 TMS Adapter
 *
 * Integrates with project44 API to fetch load/shipment data.
 *
 * API Documentation: https://developers.project44.com/
 *
 * Authentication: OAuth 2.0 (Client Credentials)
 * Base URL: https://na12.api.project44.com/api/v4
 * Sandbox: https://na12.api.sandbox.p-44.com/api/v4
 */
export class Project44TMSAdapter implements ITMSAdapter {
  private readonly baseUrl = 'https://na12.api.project44.com/api/v4';
  private useMockData = true; // Set to false when ready to use real API

  // In-memory token cache
  private tokenCache: {
    token: string | null;
    expiresAt: number | null;
  } = {
    token: null,
    expiresAt: null,
  };

  /**
   * Test connection to project44 API
   *
   * In mock mode: Only succeeds if credentials are provided (any non-empty values)
   * This makes it feel like a real connection test
   */
  async testConnection(clientId: string, clientSecret: string): Promise<boolean> {
    // Validate credentials are provided (even in mock mode)
    if (!clientId || !clientSecret) {
      return false;
    }

    if (this.useMockData) {
      // In mock mode, accept any non-empty credentials
      return true;
    }

    try {
      const token = await this.getOAuthToken(clientId, clientSecret);
      return !!token;
    } catch (error) {
      console.error('project44 connection test failed:', error);
      return false;
    }
  }

  /**
   * Get all active loads from project44
   *
   * In mock mode: Only returns data if credentials are provided
   */
  async getActiveLoads(clientId: string, clientSecret: string): Promise<LoadData[]> {
    // Validate credentials are provided
    if (!clientId || !clientSecret) {
      throw new Error('project44 credentials not configured');
    }

    if (this.useMockData) {
      return this.getMockLoads();
    }

    try {
      const token = await this.getOAuthToken(clientId, clientSecret);

      const response = await fetch(`${this.baseUrl}/loads?status=active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`project44 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const loads = data.data || [];

      return loads.map((load: any) => this.transformLoadData(load));
    } catch (error) {
      console.error('Failed to fetch loads from project44:', error);
      throw error;
    }
  }

  /**
   * Get specific load by ID
   *
   * In mock mode: Only returns data if credentials are provided
   */
  async getLoad(clientId: string, clientSecret: string, loadId: string): Promise<LoadData> {
    // Validate credentials are provided
    if (!clientId || !clientSecret) {
      throw new Error('project44 credentials not configured');
    }

    if (this.useMockData) {
      const mockLoads = this.getMockLoads();
      const load = mockLoads.find((l) => l.load_id === loadId);
      if (!load) {
        throw new Error(`Load ${loadId} not found`);
      }
      return load;
    }

    try {
      const token = await this.getOAuthToken(clientId, clientSecret);

      const response = await fetch(`${this.baseUrl}/loads/${loadId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`project44 API error: ${response.status} ${response.statusText}`);
      }

      const load = await response.json();
      return this.transformLoadData(load);
    } catch (error) {
      console.error(`Failed to fetch load ${loadId} from project44:`, error);
      throw error;
    }
  }

  /**
   * Sync all loads (fetch and return IDs)
   *
   * In mock mode: Only returns data if credentials are provided
   */
  async syncAllLoads(clientId: string, clientSecret: string): Promise<string[]> {
    // Validate credentials are provided
    if (!clientId || !clientSecret) {
      throw new Error('project44 credentials not configured');
    }

    const loads = await this.getActiveLoads(clientId, clientSecret);
    return loads.map((load) => load.load_id);
  }

  /**
   * Get all drivers from project44
   *
   * In mock mode: Only returns data if credentials are provided
   */
  async getDrivers(clientId: string, clientSecret: string): Promise<DriverData[]> {
    // Validate credentials are provided
    if (!clientId || !clientSecret) {
      throw new Error('project44 credentials not configured');
    }

    if (this.useMockData) {
      return this.getMockDrivers();
    }

    try {
      const token = await this.getOAuthToken(clientId, clientSecret);

      const response = await fetch(`${this.baseUrl}/drivers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`project44 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const drivers = data.data || [];

      return drivers.map((driver: any) => this.transformDriverData(driver));
    } catch (error) {
      console.error('Failed to fetch drivers from project44:', error);
      throw error;
    }
  }

  /**
   * Get all vehicles from project44
   *
   * In mock mode: Only returns data if credentials are provided
   */
  async getVehicles(clientId: string, clientSecret: string): Promise<VehicleData[]> {
    // Validate credentials are provided
    if (!clientId || !clientSecret) {
      throw new Error('project44 credentials not configured');
    }

    if (this.useMockData) {
      return this.getMockVehicles();
    }

    try {
      const token = await this.getOAuthToken(clientId, clientSecret);

      const response = await fetch(`${this.baseUrl}/vehicles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`project44 API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const vehicles = data.data || [];

      return vehicles.map((vehicle: any) => this.transformVehicleData(vehicle));
    } catch (error) {
      console.error('Failed to fetch vehicles from project44:', error);
      throw error;
    }
  }

  /**
   * Get OAuth 2.0 access token from project44
   * Tokens are cached and reused for 12 hours
   */
  private async getOAuthToken(clientId: string, clientSecret: string): Promise<string> {
    // Check if cached token is still valid
    if (this.tokenCache.token && this.tokenCache.expiresAt) {
      const now = Date.now();
      if (now < this.tokenCache.expiresAt) {
        return this.tokenCache.token;
      }
    }

    // Get new token
    const response = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth token request failed: ${response.status}`);
    }

    const data = await response.json();

    // Cache token (expires in ~12 hours = 43200 seconds)
    this.tokenCache.token = data.access_token;
    this.tokenCache.expiresAt = Date.now() + (data.expires_in * 1000);

    return data.access_token;
  }

  /**
   * Transform project44 driver data to DriverData format
   */
  private transformDriverData(p44Driver: any): DriverData {
    return {
      driver_id: p44Driver.id || p44Driver.driverId,
      first_name: p44Driver.firstName || '',
      last_name: p44Driver.lastName || '',
      phone: p44Driver.phone || p44Driver.phoneNumber || '',
      email: p44Driver.email,
      license_number: p44Driver.licenseNumber,
      license_state: p44Driver.licenseState,
      status: this.mapDriverStatus(p44Driver.status),
      current_location: p44Driver.currentLocation ? {
        latitude: p44Driver.currentLocation.latitude,
        longitude: p44Driver.currentLocation.longitude,
        city: p44Driver.currentLocation.city,
        state: p44Driver.currentLocation.state,
      } : undefined,
      assigned_vehicle_id: p44Driver.assignedVehicleId,
      data_source: 'project44_tms',
    };
  }

  /**
   * Transform project44 vehicle data to VehicleData format
   */
  private transformVehicleData(p44Vehicle: any): VehicleData {
    return {
      vehicle_id: p44Vehicle.id || p44Vehicle.vehicleId,
      unit_number: p44Vehicle.unitNumber || p44Vehicle.number || '',
      make: p44Vehicle.make || '',
      model: p44Vehicle.model || '',
      year: p44Vehicle.year || 0,
      vin: p44Vehicle.vin,
      license_plate: p44Vehicle.licensePlate,
      license_state: p44Vehicle.licenseState,
      status: this.mapVehicleStatus(p44Vehicle.status),
      current_location: p44Vehicle.currentLocation ? {
        latitude: p44Vehicle.currentLocation.latitude,
        longitude: p44Vehicle.currentLocation.longitude,
        city: p44Vehicle.currentLocation.city,
        state: p44Vehicle.currentLocation.state,
      } : undefined,
      assigned_driver_id: p44Vehicle.assignedDriverId,
      data_source: 'project44_tms',
    };
  }

  /**
   * Transform project44 load data to SALLY LoadData format
   */
  private transformLoadData(p44Load: any): LoadData {
    return {
      load_id: p44Load.externalLoadNumber || p44Load.id,
      pickup_location: {
        address: p44Load.pickupStopReference?.address || '',
        city: p44Load.pickupStopReference?.city || '',
        state: p44Load.pickupStopReference?.state || '',
        zip: p44Load.pickupStopReference?.zip || '',
        latitude: p44Load.pickupStopReference?.latitude || 0,
        longitude: p44Load.pickupStopReference?.longitude || 0,
      },
      delivery_location: {
        address: p44Load.deliveryStopReference?.address || '',
        city: p44Load.deliveryStopReference?.city || '',
        state: p44Load.deliveryStopReference?.state || '',
        zip: p44Load.deliveryStopReference?.zip || '',
        latitude: p44Load.deliveryStopReference?.latitude || 0,
        longitude: p44Load.deliveryStopReference?.longitude || 0,
      },
      pickup_appointment: p44Load.pickupStopReference?.appointmentTime || null,
      delivery_appointment: p44Load.deliveryStopReference?.appointmentTime || null,
      assigned_driver_id: null, // project44 doesn't directly expose driver ID
      status: this.mapStatus(p44Load.status),
      total_miles: this.calculateDistance(
        p44Load.pickupStopReference?.latitude,
        p44Load.pickupStopReference?.longitude,
        p44Load.deliveryStopReference?.latitude,
        p44Load.deliveryStopReference?.longitude,
      ),
      data_source: 'project44_tms',
    };
  }

  /**
   * Map project44 load status to SALLY status
   */
  private mapStatus(p44Status: string): 'UNASSIGNED' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' {
    const statusMap: Record<string, 'UNASSIGNED' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'> = {
      'CREATED': 'ASSIGNED',
      'ACTIVE': 'ASSIGNED',
      'IN_TRANSIT': 'IN_TRANSIT',
      'DELIVERED': 'DELIVERED',
      'CANCELLED': 'CANCELLED',
      'PENDING': 'ASSIGNED',
    };

    return statusMap[p44Status] || 'ASSIGNED';
  }

  /**
   * Map project44 driver status
   */
  private mapDriverStatus(p44Status: string): 'ACTIVE' | 'INACTIVE' | 'ON_DUTY' | 'OFF_DUTY' {
    const statusMap: Record<string, 'ACTIVE' | 'INACTIVE' | 'ON_DUTY' | 'OFF_DUTY'> = {
      'ACTIVE': 'ACTIVE',
      'INACTIVE': 'INACTIVE',
      'ON_DUTY': 'ON_DUTY',
      'OFF_DUTY': 'OFF_DUTY',
      'AVAILABLE': 'ACTIVE',
      'UNAVAILABLE': 'INACTIVE',
    };

    return statusMap[p44Status] || 'ACTIVE';
  }

  /**
   * Map project44 vehicle status
   */
  private mapVehicleStatus(p44Status: string): 'ACTIVE' | 'INACTIVE' | 'IN_SERVICE' | 'OUT_OF_SERVICE' {
    const statusMap: Record<string, 'ACTIVE' | 'INACTIVE' | 'IN_SERVICE' | 'OUT_OF_SERVICE'> = {
      'ACTIVE': 'ACTIVE',
      'INACTIVE': 'INACTIVE',
      'IN_SERVICE': 'IN_SERVICE',
      'OUT_OF_SERVICE': 'OUT_OF_SERVICE',
      'AVAILABLE': 'ACTIVE',
      'UNAVAILABLE': 'INACTIVE',
      'MAINTENANCE': 'OUT_OF_SERVICE',
    };

    return statusMap[p44Status] || 'ACTIVE';
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1?: number, lon1?: number, lat2?: number, lon2?: number): number {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Generate mock load data matching project44 response format
   */
  private getMockLoads(): LoadData[] {
    return [
      {
        load_id: 'P44-LOAD-2026-001',
        pickup_location: {
          address: '2000 Logistics Ave',
          city: 'Phoenix',
          state: 'AZ',
          zip: '85001',
          latitude: 33.4484,
          longitude: -112.074,
        },
        delivery_location: {
          address: '5500 Distribution Center',
          city: 'Las Vegas',
          state: 'NV',
          zip: '89101',
          latitude: 36.1699,
          longitude: -115.1398,
        },
        pickup_appointment: '2026-02-05T08:00:00Z',
        delivery_appointment: '2026-02-05T14:30:00Z',
        assigned_driver_id: 'DRV-001',
        status: 'IN_TRANSIT',
        total_miles: 297,
        data_source: 'project44_tms',
      },
      {
        load_id: 'P44-LOAD-2026-002',
        pickup_location: {
          address: '1234 Warehouse Blvd',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90001',
          latitude: 33.9731,
          longitude: -118.2479,
        },
        delivery_location: {
          address: '7890 Commerce St',
          city: 'San Diego',
          state: 'CA',
          zip: '92101',
          latitude: 32.7157,
          longitude: -117.1611,
        },
        pickup_appointment: '2026-02-06T10:00:00Z',
        delivery_appointment: '2026-02-06T15:00:00Z',
        assigned_driver_id: 'DRV-002',
        status: 'ASSIGNED',
        total_miles: 120,
        data_source: 'project44_tms',
      },
      {
        load_id: 'P44-LOAD-2026-003',
        pickup_location: {
          address: '456 Industrial Way',
          city: 'Dallas',
          state: 'TX',
          zip: '75201',
          latitude: 32.7767,
          longitude: -96.797,
        },
        delivery_location: {
          address: '789 Retail Plaza',
          city: 'Houston',
          state: 'TX',
          zip: '77002',
          latitude: 29.7604,
          longitude: -95.3698,
        },
        pickup_appointment: '2026-02-07T07:00:00Z',
        delivery_appointment: '2026-02-07T16:00:00Z',
        assigned_driver_id: 'DRV-003',
        status: 'ASSIGNED',
        total_miles: 239,
        data_source: 'project44_tms',
      },
      {
        load_id: 'P44-LOAD-2026-004',
        pickup_location: {
          address: '1111 Manufacturing Dr',
          city: 'Atlanta',
          state: 'GA',
          zip: '30303',
          latitude: 33.749,
          longitude: -84.388,
        },
        delivery_location: {
          address: '2222 Fulfillment Center',
          city: 'Charlotte',
          state: 'NC',
          zip: '28202',
          latitude: 35.2271,
          longitude: -80.8431,
        },
        pickup_appointment: '2026-02-08T09:00:00Z',
        delivery_appointment: '2026-02-08T17:00:00Z',
        assigned_driver_id: null, // Not yet assigned
        status: 'ASSIGNED',
        total_miles: 244,
        data_source: 'project44_tms',
      },
      {
        load_id: 'P44-LOAD-2026-005',
        pickup_location: {
          address: '3333 Port Terminal',
          city: 'Seattle',
          state: 'WA',
          zip: '98101',
          latitude: 47.6062,
          longitude: -122.3321,
        },
        delivery_location: {
          address: '4444 Distribution Hub',
          city: 'Portland',
          state: 'OR',
          zip: '97201',
          latitude: 45.5152,
          longitude: -122.6784,
        },
        pickup_appointment: '2026-02-09T06:00:00Z',
        delivery_appointment: '2026-02-09T12:00:00Z',
        assigned_driver_id: 'DRV-005',
        status: 'DELIVERED',
        total_miles: 173,
        data_source: 'project44_tms',
      },
    ];
  }

  /**
   * Generate mock driver data matching project44 response format
   */
  private getMockDrivers(): DriverData[] {
    return [
      {
        driver_id: 'DRV-001',
        first_name: 'John',
        last_name: 'Martinez',
        phone: '+1-555-0101',
        email: 'john.martinez@example.com',
        license_number: 'D1234567',
        license_state: 'AZ',
        status: 'ON_DUTY',
        current_location: {
          latitude: 35.5,
          longitude: -113.5,
          city: 'Kingman',
          state: 'AZ',
        },
        assigned_vehicle_id: 'VEH-101',
        data_source: 'project44_tms',
      },
      {
        driver_id: 'DRV-002',
        first_name: 'Sarah',
        last_name: 'Thompson',
        phone: '+1-555-0102',
        email: 'sarah.thompson@example.com',
        license_number: 'D2345678',
        license_state: 'CA',
        status: 'ON_DUTY',
        current_location: {
          latitude: 33.9731,
          longitude: -118.2479,
          city: 'Los Angeles',
          state: 'CA',
        },
        assigned_vehicle_id: 'VEH-102',
        data_source: 'project44_tms',
      },
      {
        driver_id: 'DRV-003',
        first_name: 'Michael',
        last_name: 'Johnson',
        phone: '+1-555-0103',
        email: 'michael.johnson@example.com',
        license_number: 'D3456789',
        license_state: 'TX',
        status: 'ON_DUTY',
        current_location: {
          latitude: 32.7767,
          longitude: -96.797,
          city: 'Dallas',
          state: 'TX',
        },
        assigned_vehicle_id: 'VEH-103',
        data_source: 'project44_tms',
      },
      {
        driver_id: 'DRV-004',
        first_name: 'Emily',
        last_name: 'Rodriguez',
        phone: '+1-555-0104',
        email: 'emily.rodriguez@example.com',
        license_number: 'D4567890',
        license_state: 'GA',
        status: 'OFF_DUTY',
        current_location: {
          latitude: 33.749,
          longitude: -84.388,
          city: 'Atlanta',
          state: 'GA',
        },
        assigned_vehicle_id: 'VEH-104',
        data_source: 'project44_tms',
      },
      {
        driver_id: 'DRV-005',
        first_name: 'David',
        last_name: 'Chen',
        phone: '+1-555-0105',
        email: 'david.chen@example.com',
        license_number: 'D5678901',
        license_state: 'WA',
        status: 'ACTIVE',
        current_location: {
          latitude: 45.5152,
          longitude: -122.6784,
          city: 'Portland',
          state: 'OR',
        },
        assigned_vehicle_id: 'VEH-105',
        data_source: 'project44_tms',
      },
    ];
  }

  /**
   * Generate mock vehicle data matching project44 response format
   */
  private getMockVehicles(): VehicleData[] {
    return [
      {
        vehicle_id: 'VEH-101',
        unit_number: '101',
        make: 'Freightliner',
        model: 'Cascadia',
        year: 2022,
        vin: '1FUJGLDR7NLAA1234',
        license_plate: 'AZ12345',
        license_state: 'AZ',
        status: 'IN_SERVICE',
        current_location: {
          latitude: 35.5,
          longitude: -113.5,
          city: 'Kingman',
          state: 'AZ',
        },
        assigned_driver_id: 'DRV-001',
        data_source: 'project44_tms',
      },
      {
        vehicle_id: 'VEH-102',
        unit_number: '102',
        make: 'Kenworth',
        model: 'T680',
        year: 2023,
        vin: '1XKYDP9X2NJ345678',
        license_plate: 'CA67890',
        license_state: 'CA',
        status: 'IN_SERVICE',
        current_location: {
          latitude: 33.9731,
          longitude: -118.2479,
          city: 'Los Angeles',
          state: 'CA',
        },
        assigned_driver_id: 'DRV-002',
        data_source: 'project44_tms',
      },
      {
        vehicle_id: 'VEH-103',
        unit_number: '103',
        make: 'Peterbilt',
        model: '579',
        year: 2022,
        vin: '1XPBDP9X7ND456789',
        license_plate: 'TX45678',
        license_state: 'TX',
        status: 'IN_SERVICE',
        current_location: {
          latitude: 32.7767,
          longitude: -96.797,
          city: 'Dallas',
          state: 'TX',
        },
        assigned_driver_id: 'DRV-003',
        data_source: 'project44_tms',
      },
      {
        vehicle_id: 'VEH-104',
        unit_number: '104',
        make: 'Volvo',
        model: 'VNL 760',
        year: 2021,
        vin: '4V4NC9TH5MN567890',
        license_plate: 'GA23456',
        license_state: 'GA',
        status: 'ACTIVE',
        current_location: {
          latitude: 33.749,
          longitude: -84.388,
          city: 'Atlanta',
          state: 'GA',
        },
        assigned_driver_id: 'DRV-004',
        data_source: 'project44_tms',
      },
      {
        vehicle_id: 'VEH-105',
        unit_number: '105',
        make: 'International',
        model: 'LT Series',
        year: 2023,
        vin: '3AKJHHDR8NSJK6789',
        license_plate: 'WA78901',
        license_state: 'WA',
        status: 'IN_SERVICE',
        current_location: {
          latitude: 45.5152,
          longitude: -122.6784,
          city: 'Portland',
          state: 'OR',
        },
        assigned_driver_id: 'DRV-005',
        data_source: 'project44_tms',
      },
    ];
  }
}
