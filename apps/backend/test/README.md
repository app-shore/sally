# E2E Tests

## Overview

This directory contains end-to-end integration tests for the SALLY backend API.

## Test Files

- `app.e2e.spec.ts` - Basic health check test
- `integrations.e2e.spec.ts` - Comprehensive integration API tests

## Running Tests

### Prerequisites

1. Database must be running:
   ```bash
   docker-compose up -d postgres redis
   ```

2. Database must be seeded with test data:
   ```bash
   npm run db:seed
   ```

### Running E2E Tests

```bash
npm run test:e2e
```

## Known Issues

### UUID ES Module Issue

The current Jest configuration has issues with uuid v13+ which uses pure ES modules. A workaround has been implemented using a mock in `__mocks__/uuid.js`.

If you encounter issues running tests, ensure:
1. The uuid mock is properly configured in `jest-e2e.json`
2. Prisma client has been generated: `npm run prisma:generate`

## Integration Tests

The `integrations.e2e.spec.ts` file tests:

### Create Integration Endpoints
- ✅ Creating Samsara HOS/ELD integration
- ✅ Creating Truckbase TMS integration
- ✅ Creating FuelFinder integration
- ✅ Creating OpenWeather integration
- ✅ Validation (rejecting invalid integration types)
- ✅ Authentication (rejecting unauthenticated requests)

### List Integrations
- ✅ Listing all integrations for a tenant

### Test Connection
- ✅ Testing integration connection
- ✅ Handling non-existent integrations

### Manual Sync
- ✅ Triggering manual sync
- ✅ Verifying sync log creation

### Update Integration
- ✅ Updating display name
- ✅ Updating credentials
- ✅ Disabling integration

### Delete Integration
- ✅ Deleting integration
- ✅ Verifying deletion

### Real API Tests
- ✅ Testing with real API credentials (conditionally run if env vars are set)
- ✅ Real Samsara connection test
- ✅ Real Samsara sync

## Test Data

Tests use the seeded test user `user_multi_jyc` (test@example.com) which belongs to the JYC Carriers tenant.

## Environment Variables

For real API tests to run, set:
- `SAMSARA_API_KEY`
- `TRUCKBASE_API_KEY`
- `FUELFINDER_API_KEY`
- `OPENWEATHER_API_KEY`

If these are not set, real API tests will be skipped.
