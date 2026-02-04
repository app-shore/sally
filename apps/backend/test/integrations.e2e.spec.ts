import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Integrations E2E Test', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same validation pipe as the main app
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    // Get Prisma service for test data verification
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Login to get JWT token
    // Using the test user 'test@example.com' from seed data (user_multi_jyc)
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        user_id: 'user_multi_jyc',
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('accessToken');
    jwtToken = loginResponse.body.accessToken;
    tenantId = loginResponse.body.user.tenantId;

    console.log('✓ Authentication successful');
  });

  afterAll(async () => {
    // Clean up test integrations
    await prisma.integrationConfig.deleteMany({
      where: {
        display_name: {
          contains: 'E2E Test',
        },
      },
    });

    await app.close();
  });

  describe('POST /integrations', () => {
    it('should create Samsara HOS/ELD integration', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          integration_type: 'HOS_ELD',
          vendor: 'SAMSARA_ELD',
          display_name: 'E2E Test Samsara',
          credentials: {
            apiKey: process.env.SAMSARA_API_KEY || 'test-api-key',
          },
          sync_interval_seconds: 300,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.vendor).toBe('SAMSARA_ELD');
      expect(response.body.integration_type).toBe('HOS_ELD');
      expect(response.body.display_name).toBe('E2E Test Samsara');
      expect(response.body.is_enabled).toBe(true);
      expect(response.body.tenant_id).toBe(tenantId);
    });

    it('should create Truckbase TMS integration', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          integration_type: 'TMS',
          vendor: 'TRUCKBASE_TMS',
          display_name: 'E2E Test Truckbase',
          credentials: {
            apiKey: process.env.TRUCKBASE_API_KEY || 'test-api-key',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.vendor).toBe('TRUCKBASE_TMS');
      expect(response.body.integration_type).toBe('TMS');
    });

    it('should create FuelFinder integration', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          integration_type: 'FUEL_PRICE',
          vendor: 'FUELFINDER_FUEL',
          display_name: 'E2E Test FuelFinder',
          credentials: {
            apiKey: process.env.FUELFINDER_API_KEY || 'test-api-key',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.vendor).toBe('FUELFINDER_FUEL');
      expect(response.body.integration_type).toBe('FUEL_PRICE');
    });

    it('should create OpenWeather integration', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          integration_type: 'WEATHER',
          vendor: 'OPENWEATHER',
          display_name: 'E2E Test OpenWeather',
          credentials: {
            apiKey: process.env.OPENWEATHER_API_KEY || 'test-api-key',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.vendor).toBe('OPENWEATHER');
      expect(response.body.integration_type).toBe('WEATHER');
    });

    it('should reject invalid integration type', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          integration_type: 'INVALID_TYPE',
          vendor: 'SAMSARA_ELD',
          display_name: 'E2E Test Invalid',
        });

      expect(response.status).toBe(400);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/integrations')
        .send({
          integration_type: 'HOS_ELD',
          vendor: 'SAMSARA_ELD',
          display_name: 'E2E Test Unauthenticated',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /integrations', () => {
    it('should list all integrations for the tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/integrations')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // All integrations should belong to the same tenant
      response.body.forEach((integration: any) => {
        expect(integration.tenant_id).toBe(tenantId);
      });
    });
  });

  describe('POST /integrations/:integrationId/test', () => {
    let integrationId: string;

    beforeAll(async () => {
      // Create a test integration first
      const createResponse = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          integration_type: 'HOS_ELD',
          vendor: 'SAMSARA_ELD',
          display_name: 'E2E Test Connection Test',
          credentials: {
            apiKey: process.env.SAMSARA_API_KEY || 'test-api-key',
          },
        });

      integrationId = createResponse.body.id;
    });

    it('should test connection successfully', async () => {
      const testResponse = await request(app.getHttpServer())
        .post(`/integrations/${integrationId}/test`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(testResponse.status).toBe(200);
      expect(testResponse.body).toHaveProperty('success');

      if (process.env.SAMSARA_API_KEY) {
        // With real API key, should succeed
        expect(testResponse.body.success).toBe(true);
      } else {
        // Without API key, may fail but should return structured response
        expect(testResponse.body).toHaveProperty('message');
      }
    });

    it('should return 404 for non-existent integration', async () => {
      const testResponse = await request(app.getHttpServer())
        .post('/integrations/non-existent-id/test')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(testResponse.status).toBe(404);
    });
  });

  describe('POST /integrations/:integrationId/sync', () => {
    let integrationId: string;

    beforeAll(async () => {
      // Create a test integration first
      const createResponse = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          integration_type: 'HOS_ELD',
          vendor: 'SAMSARA_ELD',
          display_name: 'E2E Test Manual Sync',
          credentials: {
            apiKey: process.env.SAMSARA_API_KEY || 'test-api-key',
          },
        });

      integrationId = createResponse.body.id;
    });

    it('should trigger manual sync', async () => {
      const syncResponse = await request(app.getHttpServer())
        .post(`/integrations/${integrationId}/sync`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(syncResponse.status).toBe(200);
      expect(syncResponse.body).toHaveProperty('success');

      // Verify sync log was created
      const syncLogs = await prisma.integrationSyncLog.findMany({
        where: {
          integration_id: integrationId,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 1,
      });

      expect(syncLogs.length).toBe(1);
      expect(['SUCCESS', 'FAILED']).toContain(syncLogs[0].status);
    });
  });

  describe('PATCH /integrations/:integrationId', () => {
    let integrationId: string;

    beforeAll(async () => {
      // Create a test integration first
      const createResponse = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          integration_type: 'HOS_ELD',
          vendor: 'SAMSARA_ELD',
          display_name: 'E2E Test Update',
          credentials: {
            apiKey: 'initial-key',
          },
        });

      integrationId = createResponse.body.id;
    });

    it('should update integration display name', async () => {
      const updateResponse = await request(app.getHttpServer())
        .patch(`/integrations/${integrationId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          display_name: 'E2E Test Updated Name',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.display_name).toBe('E2E Test Updated Name');
    });

    it('should update integration credentials', async () => {
      const updateResponse = await request(app.getHttpServer())
        .patch(`/integrations/${integrationId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          credentials: {
            apiKey: process.env.SAMSARA_API_KEY || 'updated-key',
          },
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.credentials).toHaveProperty('apiKey');
    });

    it('should disable integration', async () => {
      const updateResponse = await request(app.getHttpServer())
        .patch(`/integrations/${integrationId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          is_enabled: false,
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.is_enabled).toBe(false);
    });
  });

  describe('DELETE /integrations/:integrationId', () => {
    it('should delete integration', async () => {
      // Create a test integration to delete
      const createResponse = await request(app.getHttpServer())
        .post('/integrations')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          integration_type: 'HOS_ELD',
          vendor: 'SAMSARA_ELD',
          display_name: 'E2E Test Delete',
          credentials: {
            apiKey: 'test-key',
          },
        });

      const integrationId = createResponse.body.id;

      // Delete the integration
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/integrations/${integrationId}`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(deleteResponse.status).toBe(200);

      // Verify it's deleted
      const getResponse = await request(app.getHttpServer())
        .get(`/integrations/${integrationId}`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Real API Integration Tests', () => {
    // These tests only run if environment variables are set
    const shouldRunRealAPITests =
      process.env.SAMSARA_API_KEY &&
      process.env.TRUCKBASE_API_KEY &&
      process.env.FUELFINDER_API_KEY &&
      process.env.OPENWEATHER_API_KEY;

    const describeIf = shouldRunRealAPITests ? describe : describe.skip;

    describeIf('with real API credentials', () => {
      it('should successfully test Samsara connection', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/integrations')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({
            integration_type: 'HOS_ELD',
            vendor: 'SAMSARA_ELD',
            display_name: 'E2E Test Real Samsara',
            credentials: {
              apiKey: process.env.SAMSARA_API_KEY,
            },
          });

        const integrationId = createResponse.body.id;

        const testResponse = await request(app.getHttpServer())
          .post(`/integrations/${integrationId}/test`)
          .set('Authorization', `Bearer ${jwtToken}`);

        expect(testResponse.status).toBe(200);
        expect(testResponse.body.success).toBe(true);
      });

      it('should successfully sync from Samsara', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/integrations')
          .set('Authorization', `Bearer ${jwtToken}`)
          .send({
            integration_type: 'HOS_ELD',
            vendor: 'SAMSARA_ELD',
            display_name: 'E2E Test Real Samsara Sync',
            credentials: {
              apiKey: process.env.SAMSARA_API_KEY,
            },
          });

        const integrationId = createResponse.body.id;

        const syncResponse = await request(app.getHttpServer())
          .post(`/integrations/${integrationId}/sync`)
          .set('Authorization', `Bearer ${jwtToken}`);

        expect(syncResponse.status).toBe(200);
        expect(syncResponse.body.success).toBe(true);

        // Verify sync log
        const syncLogs = await prisma.integrationSyncLog.findMany({
          where: {
            integration_id: integrationId,
          },
        });

        expect(syncLogs.length).toBeGreaterThan(0);
        expect(syncLogs[0].status).toBe('SUCCESS');
      });
    });

    if (!shouldRunRealAPITests) {
      console.log('\n⚠️  Skipping real API tests - environment variables not set');
      console.log('Set SAMSARA_API_KEY, TRUCKBASE_API_KEY, FUELFINDER_API_KEY, and OPENWEATHER_API_KEY to run real API tests\n');
    }
  });
});
