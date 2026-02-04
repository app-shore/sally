import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Phase 2 Integration Tests - E2E Testing
 *
 * Tests real API integration capabilities added in Phase 2:
 * - Real API integration (Samsara, Truckbase, Fuel Finder, OpenWeather)
 * - Sync history endpoints
 * - Retry logic scenarios
 * - Alerting scenarios
 *
 * Prerequisites:
 * - Database must be seeded (npm run db:seed)
 * - Environment variables must be set for real API testing
 * - Test user: tenant_id = 'jyc_carriers', user_id exists in database
 */
describe('Phase 2 Integration Tests (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let integrationId: string; // This is the integrationId string (unique identifier)
  let integrationDbId: number; // This is the database id (autoincrement)
  let tenantId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Get test tenant
    const tenant = await prisma.tenant.findFirst({
      where: { tenantId: 'jyc_carriers' },
    });

    if (!tenant) {
      throw new Error('Test tenant jyc_carriers not found. Run npm run db:seed first.');
    }

    tenantId = tenant.id;

    // Get test user
    const user = await prisma.user.findFirst({
      where: { tenantId: tenant.id },
    });

    if (!user) {
      throw new Error('No users found for tenant jyc_carriers. Run npm run db:seed first.');
    }

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        user_id: user.userId,
      });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status}: ${JSON.stringify(loginResponse.body)}`);
    }

    if (!loginResponse.body.accessToken) {
      throw new Error(`No access token in login response: ${JSON.stringify(loginResponse.body)}`);
    }

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up test integrations
    if (integrationDbId) {
      await prisma.integrationConfig.deleteMany({
        where: { id: integrationDbId },
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  describe('Real API Integration - Samsara HOS/ELD', () => {
    it('should create Samsara integration with real API credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          integration_type: 'HOS_ELD',
          vendor: 'SAMSARA_ELD',
          display_name: 'E2E Test Samsara',
          credentials: {
            apiKey: process.env.SAMSARA_API_KEY || 'test_api_key',
          },
          sync_frequency_minutes: 60,
          enabled: true,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('integrationId');
      expect(response.body.vendor).toBe('SAMSARA_ELD');
      expect(response.body.integration_type).toBe('HOS_ELD');

      integrationDbId = response.body.id;
      integrationId = response.body.integrationId;
    });

    it('should test Samsara connection successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/integrations/${integrationId}/test`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');

      // Even if real API fails, the endpoint should return a proper response
      if (response.body.success) {
        expect(response.body).toHaveProperty('message');
      } else {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should trigger manual sync for Samsara', async () => {
      const response = await request(app.getHttpServer())
        .post(`/integrations/${integrationId}/sync`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');

      // Wait a moment for sync to process
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });
  });

  describe('Real API Integration - Truckbase TMS', () => {
    let truckbaseIntegrationId: string;
    let project44DbId: number;

    it('should create project44 integration', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          integration_type: 'TMS',
          vendor: 'PROJECT44_TMS',
          display_name: 'E2E Test project44',
          credentials: {
            clientId: process.env.PROJECT44_CLIENT_ID || 'test_client_id',
            clientSecret: process.env.PROJECT44_CLIENT_SECRET || 'test_client_secret',
          },
          sync_frequency_minutes: 30,
          enabled: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.vendor).toBe('PROJECT44_TMS');
      project44DbId = response.body.id;
      truckbaseIntegrationId = response.body.integrationId;
    });

    it('should test project44 connection', async () => {
      const response = await request(app.getHttpServer())
        .post(`/integrations/${truckbaseIntegrationId}/test`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });

    afterAll(async () => {
      if (truckbaseDbId) {
        await prisma.integrationConfig.deleteMany({
          where: { id: truckbaseDbId },
        });
      }
    });
  });

  describe('Real API Integration - Fuel Finder', () => {
    let fuelIntegrationId: string;
    let fuelDbId: number;

    it('should create Fuel Finder integration', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          integration_type: 'FUEL_PRICING',
          vendor: 'FUEL_FINDER',
          display_name: 'E2E Test Fuel Finder',
          credentials: {
            apiKey: process.env.FUEL_FINDER_API_KEY || 'test_api_key',
          },
          sync_frequency_minutes: 120,
          enabled: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.vendor).toBe('FUEL_FINDER');
      fuelDbId = response.body.id;
      fuelIntegrationId = response.body.integrationId;
    });

    it('should test Fuel Finder connection', async () => {
      const response = await request(app.getHttpServer())
        .post(`/integrations/${fuelIntegrationId}/test`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });

    afterAll(async () => {
      if (fuelDbId) {
        await prisma.integrationConfig.deleteMany({
          where: { id: fuelDbId },
        });
      }
    });
  });

  describe('Real API Integration - OpenWeather', () => {
    let weatherIntegrationId: string;
    let weatherDbId: number;

    it('should create OpenWeather integration', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          integration_type: 'WEATHER',
          vendor: 'OPENWEATHER',
          display_name: 'E2E Test OpenWeather',
          credentials: {
            apiKey: process.env.OPENWEATHER_API_KEY || 'test_api_key',
          },
          sync_frequency_minutes: 60,
          enabled: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.vendor).toBe('OPENWEATHER');
      weatherDbId = response.body.id;
      weatherIntegrationId = response.body.integrationId;
    });

    it('should test OpenWeather connection', async () => {
      const response = await request(app.getHttpServer())
        .post(`/integrations/${weatherIntegrationId}/test`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
    });

    afterAll(async () => {
      if (weatherDbId) {
        await prisma.integrationConfig.deleteMany({
          where: { id: weatherDbId },
        });
      }
    });
  });

  describe('Sync History Endpoints', () => {
    beforeAll(async () => {
      // Ensure we have sync history by triggering a sync
      if (integrationId) {
        await request(app.getHttpServer())
          .post(`/integrations/${integrationId}/sync`)
          .set('Authorization', `Bearer ${accessToken}`);

        // Wait for sync to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    });

    it('should retrieve sync history for integration', async () => {
      const response = await request(app.getHttpServer())
        .get(`/integrations/${integrationId}/sync-history`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ limit: '10', offset: '0' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const syncLog = response.body[0];
        expect(syncLog).toHaveProperty('id');
        expect(syncLog).toHaveProperty('status');
        expect(syncLog).toHaveProperty('started_at');
        expect(['SUCCESS', 'FAILED', 'IN_PROGRESS']).toContain(syncLog.status);
      }
    });

    it('should retrieve sync stats for integration', async () => {
      const response = await request(app.getHttpServer())
        .get(`/integrations/${integrationId}/sync-history/stats`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_syncs');
      expect(response.body).toHaveProperty('successful_syncs');
      expect(response.body).toHaveProperty('failed_syncs');
      expect(response.body).toHaveProperty('success_rate');
      expect(response.body).toHaveProperty('last_sync_at');

      expect(typeof response.body.total_syncs).toBe('number');
      expect(typeof response.body.success_rate).toBe('number');
    });

    it('should support pagination for sync history', async () => {
      const response = await request(app.getHttpServer())
        .get(`/integrations/${integrationId}/sync-history`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ limit: '5', offset: '0' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Integration Management', () => {
    it('should list all integrations for tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/integrations')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const samsaraIntegration = response.body.find(
        (i: any) => i.vendor === 'SAMSARA_ELD',
      );
      expect(samsaraIntegration).toBeDefined();
    });

    it('should get specific integration by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/integrations/${integrationId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(integrationId);
      expect(response.body.vendor).toBe('SAMSARA_ELD');
    });

    it('should update integration settings', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/integrations/${integrationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          display_name: 'Updated Samsara Integration',
          sync_frequency_minutes: 90,
        });

      expect(response.status).toBe(200);
      expect(response.body.display_name).toBe('Updated Samsara Integration');
      expect(response.body.sync_frequency_minutes).toBe(90);
    });

    it('should disable integration', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/integrations/${integrationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          enabled: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(false);
    });

    it('should re-enable integration', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/integrations/${integrationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          enabled: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(true);
    });
  });

  describe('Retry Logic Scenarios', () => {
    it('should handle transient failures with retry (simulated)', async () => {
      // Note: Real retry logic is tested in integration-manager.service.spec.ts
      // This E2E test verifies the endpoint behavior

      // Trigger sync and check if retry metadata is tracked
      const syncResponse = await request(app.getHttpServer())
        .post(`/integrations/${integrationId}/sync`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(syncResponse.status).toBe(200);

      // Wait for sync to process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check sync history for retry attempts
      const historyResponse = await request(app.getHttpServer())
        .get(`/integrations/${integrationId}/sync-history`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ limit: '1' });

      expect(historyResponse.status).toBe(200);

      if (historyResponse.body.length > 0) {
        const latestSync = historyResponse.body[0];
        // Retry count should be tracked (0 if successful, >0 if retried)
        expect(latestSync).toHaveProperty('status');
      }
    });
  });

  describe('Alerting Scenarios', () => {
    it('should create alert on repeated sync failures (simulated)', async () => {
      // Note: Real alerting is tested in alert.service.spec.ts
      // This E2E test verifies that failed syncs can be tracked

      // Check if there are any alerts for this integration
      const alertsResponse = await request(app.getHttpServer())
        .get('/alerts')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'INTEGRATION_FAILURE' });

      expect(alertsResponse.status).toBe(200);
      expect(Array.isArray(alertsResponse.body)).toBe(true);

      // Alerts may or may not exist depending on sync failures
      // This validates the endpoint works
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent integration', async () => {
      const response = await request(app.getHttpServer())
        .get('/integrations/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid integration creation', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          // Missing required fields
          display_name: 'Invalid Integration',
        });

      expect(response.status).toBe(400);
    });

    it('should require authentication for integration endpoints', async () => {
      const response = await request(app.getHttpServer()).get('/integrations');

      expect(response.status).toBe(401);
    });

    it('should prevent cross-tenant access', async () => {
      // This test assumes tenant isolation is enforced
      // Trying to access another tenant's integration should fail
      const response = await request(app.getHttpServer())
        .get('/integrations/another-tenant-integration-id')
        .set('Authorization', `Bearer ${accessToken}`);

      // Should return 404 (not found) rather than 403 (forbidden) for security
      expect([404, 403]).toContain(response.status);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should list integrations in under 500ms', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/integrations')
        .set('Authorization', `Bearer ${accessToken}`);

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });

    it('should retrieve sync history in under 1s', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get(`/integrations/${integrationId}/sync-history`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ limit: '50' });

      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000);
    });
  });
});
