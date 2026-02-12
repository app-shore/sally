# Integration Vendor Registry - Design

> **Status:** ✅ Implemented | **Last Validated:** 2026-02-12 | **Source Plans:** `2026-02-04-vendor-registry-design.md`

---

## Overview

Backend-driven vendor registry that moves integration vendor metadata from hardcoded frontend enums to a single source of truth in the backend. Frontend renders credential forms dynamically based on backend response.

---

## Problem Statement

- Integration vendor metadata was duplicated across frontend and backend
- Vendor labels, descriptions, credential fields hardcoded in multiple locations
- Adding new vendor required changes in 5+ locations
- No single source of truth for vendor metadata

---

## Architecture

### Component 1: Backend Vendor Registry

TypeScript objects (not database-backed) defining vendor metadata:

```typescript
// apps/backend/src/api/integrations/vendor-registry.ts

export interface VendorMetadata {
  id: string;                    // 'PROJECT44_TMS'
  displayName: string;           // 'project44'
  description: string;           // 'project44 TMS integration'
  integrationType: IntegrationType;
  credentialFields: CredentialField[];
  helpUrl?: string;
  logoUrl?: string;
}

export interface CredentialField {
  name: string;                  // 'clientId'
  label: string;                 // 'Client ID' (matches vendor dashboard terminology)
  type: 'text' | 'password' | 'url' | 'number';
  required: boolean;
  helpText?: string;
  placeholder?: string;
}
```

### Component 2: API Endpoint

`GET /api/v1/integrations/vendors` - Returns all vendor metadata as array.

### Component 3: Backend Validation

On integration creation, validates:
- Vendor exists in registry
- All required credential fields provided

### Registered Vendors (9 total)

| Vendor ID | Display Name | Type | Credential Fields |
|-----------|-------------|------|-------------------|
| PROJECT44_TMS | project44 | TMS | clientId, clientSecret |
| SAMSARA_ELD | Samsara | HOS_ELD | apiToken |
| MCLEOD_TMS | McLeod | TMS | apiKey, baseUrl |
| TMW_TMS | TMW Systems | TMS | apiKey, baseUrl |
| KEEPTRUCKIN_ELD | KeepTruckin | HOS_ELD | apiToken |
| MOTIVE_ELD | Motive | HOS_ELD | apiToken |
| GASBUDDY_FUEL | GasBuddy | FUEL_PRICE | apiKey |
| FUELFINDER_FUEL | Fuel Finder | FUEL_PRICE | apiKey |
| OPENWEATHER | OpenWeather | WEATHER | apiKey |

---

## Frontend Changes

1. **Simplified types** - `IntegrationVendor` became a simple string (backend validates)
2. **Dynamic rendering** - `ConfigureIntegrationForm` fetches vendor metadata and renders credential fields dynamically
3. **Removed hardcoded mappings** - Deleted `getVendorLabel()`, `getVendorDescription()`, and all `Record<IntegrationVendor, string>` objects

---

## Design Principles

1. **Backend as Source of Truth** - Vendor metadata lives in backend only
2. **Curated Marketplace Model** - Only official integrations (no custom extensions)
3. **Speed to Ship** - Simple TypeScript objects, no database tables
4. **Zero Breaking Changes** - Existing integrations continue working
5. **Prisma Enum Retained** - Database-level validation via `enum IntegrationVendor`

---

## Current State

- ✅ Backend vendor registry with 9 vendors
- ✅ `GET /integrations/vendors` endpoint
- ✅ Credential validation on integration creation
- ✅ Frontend dynamic form rendering
- ✅ Hardcoded vendor mappings removed from frontend
- ✅ Backward compatible (existing integrations unaffected)
