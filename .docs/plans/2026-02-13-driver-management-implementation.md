# Driver Management UX Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign driver management with richer data model, dispatch roster list view, and a dedicated driver profile page.

**Architecture:** Backend-first approach — Prisma schema changes and migration, then DTOs/service/controller updates, then frontend types/API/hooks, then UI components (create dialog, list view, profile page). Each layer is a clean commit.

**Tech Stack:** Prisma 7.3, NestJS 11, class-validator, Next.js 15 (App Router), React Query, Shadcn/ui, Tailwind CSS, TypeScript

**Design Doc:** `.docs/plans/2026-02-13-driver-management-ux-redesign.md`

---

### Task 1: Prisma Schema — Add CdlClass Enum and New Driver Fields

**Files:**
- Modify: `apps/backend/prisma/schema.prisma` (lines 278-374)

**Step 1: Add CdlClass enum after SyncStatus enum (line 291)**

Add this after line 291:

```prisma
enum CdlClass {
  A
  B
  C
}
```

**Step 2: Add new fields to Driver model**

After the `email` field (line 304), add:

```prisma
  cdlClass              CdlClass?     @map("cdl_class")
  endorsements          String[]      @default([])
```

After `homeTerminalTimezone` (line 353), add:

```prisma
  homeTerminalCity      String?       @map("home_terminal_city") @db.VarChar(100)
  homeTerminalState     String?       @map("home_terminal_state") @db.VarChar(2)
```

After `homeTerminalState`, add:

```prisma
  hireDate              DateTime?     @map("hire_date") @db.Date
  medicalCardExpiry     DateTime?     @map("medical_card_expiry") @db.Date
  emergencyContactName  String?       @map("emergency_contact_name") @db.VarChar(255)
  emergencyContactPhone String?       @map("emergency_contact_phone") @db.VarChar(20)
  notes                 String?       @db.Text
```

**Important:** `cdlClass` is nullable in Prisma (so existing rows don't break), but the CreateDriverDto will require it. Existing drivers without cdlClass will show as "—" until updated.

**Step 3: Generate and run migration**

Run:
```bash
cd apps/backend && npx prisma migrate dev --name add_driver_cdl_and_profile_fields
```

Expected: Migration creates successfully, adds columns to `drivers` table.

**Step 4: Generate Prisma client**

Run:
```bash
cd apps/backend && npx prisma generate
```

Expected: Prisma client regenerated with new fields.

**Step 5: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat(schema): add CDL class, endorsements, and profile fields to Driver model"
```

---

### Task 2: Backend DTOs — Update CreateDriverDto and UpdateDriverDto

**Files:**
- Modify: `apps/backend/src/domains/fleet/drivers/dto/create-driver.dto.ts`
- Modify: `apps/backend/src/domains/fleet/drivers/dto/update-driver.dto.ts`

**Step 1: Rewrite CreateDriverDto**

Replace the entire contents of `create-driver.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsArray,
  IsDateString,
  Length,
} from 'class-validator';

export class CreateDriverDto {
  @ApiProperty({ example: 'John Doe', description: 'Driver full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '555-123-4567', description: 'Driver phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'john@example.com', description: 'Driver email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'A', description: 'CDL classification', enum: ['A', 'B', 'C'] })
  @IsEnum(['A', 'B', 'C'], { message: 'cdl_class must be A, B, or C' })
  @IsNotEmpty()
  cdl_class: string;

  @ApiProperty({ example: 'DL12345678', description: 'Driver license number' })
  @IsString()
  @IsNotEmpty()
  license_number: string;

  @ApiProperty({ example: 'TX', description: 'License issuing state (2-letter)', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  license_state?: string;
}
```

**Step 2: Rewrite UpdateDriverDto**

Replace the entire contents of `update-driver.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsArray,
  IsDateString,
  Length,
} from 'class-validator';

export class UpdateDriverDto {
  @ApiProperty({ example: 'John Smith', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: '555-123-4567', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'A', enum: ['A', 'B', 'C'], required: false })
  @IsEnum(['A', 'B', 'C'], { message: 'cdl_class must be A, B, or C' })
  @IsOptional()
  cdl_class?: string;

  @ApiProperty({ example: 'DL12345678', required: false })
  @IsString()
  @IsOptional()
  license_number?: string;

  @ApiProperty({ example: 'TX', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  license_state?: string;

  @ApiProperty({ example: ['HAZMAT', 'TANKER'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  endorsements?: string[];

  @ApiProperty({ example: '2024-03-01', required: false })
  @IsOptional()
  @IsDateString()
  hire_date?: string;

  @ApiProperty({ example: '2026-08-15', required: false })
  @IsOptional()
  @IsDateString()
  medical_card_expiry?: string;

  @ApiProperty({ example: 'Dallas', required: false })
  @IsOptional()
  @IsString()
  home_terminal_city?: string;

  @ApiProperty({ example: 'TX', required: false })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  home_terminal_state?: string;

  @ApiProperty({ example: 'Jane Smith', required: false })
  @IsOptional()
  @IsString()
  emergency_contact_name?: string;

  @ApiProperty({ example: '555-987-6543', required: false })
  @IsOptional()
  @IsString()
  emergency_contact_phone?: string;

  @ApiProperty({ example: 'Prefers I-40 corridor', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
```

**Step 3: Commit**

```bash
git add apps/backend/src/domains/fleet/drivers/dto/
git commit -m "feat(dto): add CDL class, endorsements, and profile fields to driver DTOs"
```

---

### Task 3: Backend Service — Update DriversService for New Fields

**Files:**
- Modify: `apps/backend/src/domains/fleet/drivers/services/drivers.service.ts`

**Step 1: Update the `create` method**

Update the `create` method's `data` parameter type and Prisma `create` call to include the new fields:

In the `create` method, change the `data` parameter type from:
```typescript
data: {
  name: string;
  license_number?: string;
  phone?: string;
  email?: string;
},
```
to:
```typescript
data: {
  name: string;
  phone: string;
  email: string;
  cdl_class: string;
  license_number: string;
  license_state?: string;
},
```

And change the Prisma `create` call `data` block from:
```typescript
data: {
  driverId,
  name: data.name,
  licenseNumber: data.license_number || null,
  phone: data.phone || null,
  email: data.email || null,
  status: 'ACTIVE',
  isActive: true,
  tenantId,
  syncStatus: 'MANUAL_ENTRY',
},
```
to:
```typescript
data: {
  driverId,
  name: data.name,
  phone: data.phone,
  email: data.email,
  cdlClass: data.cdl_class as any,
  licenseNumber: data.license_number,
  licenseState: data.license_state || null,
  status: 'ACTIVE',
  isActive: true,
  tenantId,
  syncStatus: 'MANUAL_ENTRY',
},
```

**Step 2: Update the `update` method**

Change the `data` parameter type from:
```typescript
data: {
  name?: string;
  license_number?: string;
  phone?: string;
  email?: string;
},
```
to:
```typescript
data: {
  name?: string;
  phone?: string;
  email?: string;
  cdl_class?: string;
  license_number?: string;
  license_state?: string;
  endorsements?: string[];
  hire_date?: string;
  medical_card_expiry?: string;
  home_terminal_city?: string;
  home_terminal_state?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
},
```

And change the Prisma `update` call `data` block to:
```typescript
data: {
  ...(data.name !== undefined ? { name: data.name } : {}),
  ...(data.phone !== undefined ? { phone: data.phone } : {}),
  ...(data.email !== undefined ? { email: data.email } : {}),
  ...(data.cdl_class !== undefined ? { cdlClass: data.cdl_class as any } : {}),
  ...(data.license_number !== undefined ? { licenseNumber: data.license_number } : {}),
  ...(data.license_state !== undefined ? { licenseState: data.license_state } : {}),
  ...(data.endorsements !== undefined ? { endorsements: data.endorsements } : {}),
  ...(data.hire_date !== undefined ? { hireDate: data.hire_date ? new Date(data.hire_date) : null } : {}),
  ...(data.medical_card_expiry !== undefined ? { medicalCardExpiry: data.medical_card_expiry ? new Date(data.medical_card_expiry) : null } : {}),
  ...(data.home_terminal_city !== undefined ? { homeTerminalCity: data.home_terminal_city } : {}),
  ...(data.home_terminal_state !== undefined ? { homeTerminalState: data.home_terminal_state } : {}),
  ...(data.emergency_contact_name !== undefined ? { emergencyContactName: data.emergency_contact_name } : {}),
  ...(data.emergency_contact_phone !== undefined ? { emergencyContactPhone: data.emergency_contact_phone } : {}),
  ...(data.notes !== undefined ? { notes: data.notes } : {}),
},
```

**Step 3: Update the `findOne` method to include relations**

Change the `findOne` method to include vehicle/load relations needed for the profile page:

```typescript
async findOne(driverId: string, tenantId: number): Promise<any> {
  const driver = await this.prisma.driver.findUnique({
    where: {
      driverId_tenantId: {
        driverId,
        tenantId,
      },
    },
    include: {
      user: {
        select: {
          userId: true,
          isActive: true,
        },
      },
      loads: {
        where: { status: { not: 'DELIVERED' } },
        select: {
          loadId: true,
          referenceNumber: true,
          status: true,
        },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      invitations: {
        where: { status: 'PENDING' },
        select: {
          invitationId: true,
          status: true,
        },
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!driver) {
    throw new NotFoundException(`Driver not found: ${driverId}`);
  }

  return driver;
}
```

**Step 4: Commit**

```bash
git add apps/backend/src/domains/fleet/drivers/services/drivers.service.ts
git commit -m "feat(service): update DriversService to handle new profile fields"
```

---

### Task 4: Backend Controller — Update Response Mappings

**Files:**
- Modify: `apps/backend/src/domains/fleet/drivers/controllers/drivers.controller.ts`

**Step 1: Update `listDrivers` response mapping**

In the `listDrivers` method, add the new fields to the returned object. After `license_number: driver.licenseNumber,` add:

```typescript
license_state: driver.licenseState,
cdl_class: driver.cdlClass,
endorsements: driver.endorsements,
```

**Step 2: Update `createDriver` handler**

Update the data passed to `this.driversService.create()`:

```typescript
const driver = await this.driversService.create(tenantDbId, {
  name: createDriverDto.name,
  phone: createDriverDto.phone,
  email: createDriverDto.email,
  cdl_class: createDriverDto.cdl_class,
  license_number: createDriverDto.license_number,
  license_state: createDriverDto.license_state,
});
```

And add new fields to the create response:

```typescript
return {
  id: driver.id,
  driver_id: driver.driverId,
  name: driver.name,
  phone: driver.phone,
  email: driver.email,
  cdl_class: driver.cdlClass,
  license_number: driver.licenseNumber,
  license_state: driver.licenseState,
  is_active: driver.isActive,
  created_at: driver.createdAt,
  updated_at: driver.updatedAt,
};
```

**Step 3: Update `updateDriver` handler**

Pass all new fields to the service:

```typescript
const driver = await this.driversService.update(driverId, tenantDbId, {
  name: updateDriverDto.name,
  phone: updateDriverDto.phone,
  email: updateDriverDto.email,
  cdl_class: updateDriverDto.cdl_class,
  license_number: updateDriverDto.license_number,
  license_state: updateDriverDto.license_state,
  endorsements: updateDriverDto.endorsements,
  hire_date: updateDriverDto.hire_date,
  medical_card_expiry: updateDriverDto.medical_card_expiry,
  home_terminal_city: updateDriverDto.home_terminal_city,
  home_terminal_state: updateDriverDto.home_terminal_state,
  emergency_contact_name: updateDriverDto.emergency_contact_name,
  emergency_contact_phone: updateDriverDto.emergency_contact_phone,
  notes: updateDriverDto.notes,
});
```

And return all fields:

```typescript
return {
  id: driver.id,
  driver_id: driver.driverId,
  name: driver.name,
  phone: driver.phone,
  email: driver.email,
  cdl_class: driver.cdlClass,
  license_number: driver.licenseNumber,
  license_state: driver.licenseState,
  endorsements: driver.endorsements,
  hire_date: driver.hireDate,
  medical_card_expiry: driver.medicalCardExpiry,
  home_terminal_city: driver.homeTerminalCity,
  home_terminal_state: driver.homeTerminalState,
  emergency_contact_name: driver.emergencyContactName,
  emergency_contact_phone: driver.emergencyContactPhone,
  notes: driver.notes,
  is_active: driver.isActive,
  updated_at: driver.updatedAt,
};
```

**Step 4: Update `getDriver` response (used by profile page)**

This is the detailed single-driver endpoint. Return ALL fields including relations:

```typescript
async getDriver(
  @Param('driver_id') driverId: string,
  @CurrentUser() user: any,
) {
  const tenantDbId = await this.getTenantDbId(user);
  const driver = await this.driversService.findOne(driverId, tenantDbId);

  // Derive SALLY access status
  let sallyAccessStatus: string = 'NO_ACCESS';
  let linkedUserId: string | null = null;
  let pendingInvitationId: string | null = null;

  if (driver.user) {
    linkedUserId = driver.user.userId;
    sallyAccessStatus = driver.user.isActive ? 'ACTIVE' : 'DEACTIVATED';
  } else if (driver.invitations?.length > 0) {
    sallyAccessStatus = 'INVITED';
    pendingInvitationId = driver.invitations[0].invitationId;
  }

  return {
    id: driver.id,
    driver_id: driver.driverId,
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    cdl_class: driver.cdlClass,
    license_number: driver.licenseNumber,
    license_state: driver.licenseState,
    endorsements: driver.endorsements,
    status: driver.status,
    is_active: driver.isActive,
    hire_date: driver.hireDate,
    medical_card_expiry: driver.medicalCardExpiry,
    home_terminal_city: driver.homeTerminalCity,
    home_terminal_state: driver.homeTerminalState,
    home_terminal_timezone: driver.homeTerminalTimezone,
    emergency_contact_name: driver.emergencyContactName,
    emergency_contact_phone: driver.emergencyContactPhone,
    notes: driver.notes,
    // External sync
    external_driver_id: driver.externalDriverId,
    external_source: driver.externalSource,
    sync_status: driver.syncStatus,
    last_synced_at: driver.lastSyncedAt?.toISOString(),
    // HOS
    current_hours_driven: driver.currentHoursDriven,
    current_on_duty_time: driver.currentOnDutyTime,
    current_hours_since_break: driver.currentHoursSinceBreak,
    cycle_hours_used: driver.cycleHoursUsed,
    // Relations
    current_load: driver.loads?.[0] ? {
      load_id: driver.loads[0].loadId,
      reference_number: driver.loads[0].referenceNumber,
      status: driver.loads[0].status,
    } : null,
    sally_access_status: sallyAccessStatus,
    linked_user_id: linkedUserId,
    pending_invitation_id: pendingInvitationId,
    created_at: driver.createdAt.toISOString(),
    updated_at: driver.updatedAt.toISOString(),
  };
}
```

**Step 5: Commit**

```bash
git add apps/backend/src/domains/fleet/drivers/controllers/drivers.controller.ts
git commit -m "feat(controller): update driver endpoints with new profile fields and relations"
```

---

### Task 5: Frontend Types and API — Update Driver Interfaces

**Files:**
- Modify: `apps/web/src/features/fleet/drivers/types.ts`
- Modify: `apps/web/src/features/fleet/drivers/api.ts`

**Step 1: Update types.ts**

Replace the full contents:

```typescript
export interface Driver {
  id: string;
  driver_id: string;
  name: string;
  phone?: string;
  email?: string;
  cdl_class?: string;
  license_number?: string;
  license_state?: string;
  endorsements?: string[];
  status?: string;
  is_active?: boolean;
  // Profile enrichment fields
  hire_date?: string;
  medical_card_expiry?: string;
  home_terminal_city?: string;
  home_terminal_state?: string;
  home_terminal_timezone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  // HOS (from structured fields)
  current_hours_driven?: number;
  current_on_duty_time?: number;
  current_hours_since_break?: number;
  cycle_hours_used?: number;
  // HOS (from integration)
  current_hos?: {
    drive_remaining: number;
    shift_remaining: number;
    cycle_remaining: number;
    break_required: boolean;
  };
  // External sync metadata
  external_driver_id?: string;
  external_source?: string;
  sync_status?: string;
  hos_data_source?: string;
  hos_data_synced_at?: string;
  last_synced_at?: string;
  // Relations
  current_load?: {
    load_id: string;
    reference_number: string;
    status: string;
  } | null;
  // SALLY access status
  sally_access_status?: 'ACTIVE' | 'INVITED' | 'NO_ACCESS' | 'DEACTIVATED';
  linked_user_id?: string;
  pending_invitation_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDriverRequest {
  name: string;
  phone: string;
  email: string;
  cdl_class: string;
  license_number: string;
  license_state?: string;
}

export interface UpdateDriverRequest {
  name?: string;
  phone?: string;
  email?: string;
  cdl_class?: string;
  license_number?: string;
  license_state?: string;
  endorsements?: string[];
  hire_date?: string;
  medical_card_expiry?: string;
  home_terminal_city?: string;
  home_terminal_state?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}

export interface DriverHOS {
  driver_id: string;
  hours_driven: number;
  on_duty_time: number;
  hours_since_break: number;
  duty_status: string;
  last_updated: string;
  data_source: string;
  cached?: boolean;
  stale?: boolean;
  cache_age_seconds?: number;
}

export interface ActivateAndInviteRequest {
  email?: string;
}

export interface ActivateAndInviteResponse {
  driver: Driver;
  invitation: {
    invitationId: string;
    email: string;
    status: string;
  };
}
```

**Step 2: No changes needed to api.ts** — the existing endpoints handle the new fields transparently since they pass objects.

**Step 3: Commit**

```bash
git add apps/web/src/features/fleet/drivers/types.ts
git commit -m "feat(types): update Driver interfaces with CDL and profile fields"
```

---

### Task 6: US States Constants

**Files:**
- Create: `apps/web/src/shared/lib/constants/us-states.ts`

**Step 1: Create the constants file**

```typescript
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
] as const;

export const ENDORSEMENT_OPTIONS = [
  { value: 'HAZMAT', label: 'Hazmat (H)' },
  { value: 'TANKER', label: 'Tanker (N)' },
  { value: 'DOUBLES_TRIPLES', label: 'Doubles/Triples (T)' },
  { value: 'PASSENGER', label: 'Passenger (P)' },
  { value: 'SCHOOL_BUS', label: 'School Bus (S)' },
] as const;

export const CDL_CLASSES = [
  { value: 'A', label: 'Class A', description: 'Combination vehicles (tractor-trailers)' },
  { value: 'B', label: 'Class B', description: 'Single vehicles over 26,001 lbs' },
  { value: 'C', label: 'Class C', description: 'Vehicles with 16+ passengers or hazmat' },
] as const;
```

**Step 2: Commit**

```bash
git add apps/web/src/shared/lib/constants/us-states.ts
git commit -m "feat: add US states, CDL classes, and endorsement constants"
```

---

### Task 7: Frontend — Redesign Create Driver Dialog

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx` (the `DriverForm` function, lines 418-511)

**Step 1: Update the DriverForm component**

Replace the `DriverForm` function (lines 418-511) with the redesigned version. The form now has 5 required fields + 1 optional.

Key changes:
- Add imports for `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from shadcn
- Add import for `US_STATES` and `CDL_CLASSES` constants
- Change `formData` state type to match new `CreateDriverRequest`
- Add CDL Class `<Select>` dropdown
- Add License State `<Select>` dropdown (optional)
- Reorder fields: Name, Phone, Email, CDL Class, License Number, License State
- Mark Phone and Email as required

The form state should be:
```typescript
const [formData, setFormData] = useState<CreateDriverRequest>({
  name: driver?.name || '',
  phone: driver?.phone || '',
  email: driver?.email || '',
  cdl_class: driver?.cdl_class || '',
  license_number: driver?.license_number || '',
  license_state: driver?.license_state || '',
});
```

Add the `Select` imports at the top of the file (around line 23-34 area):
```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
```

And import constants:
```typescript
import { US_STATES, CDL_CLASSES } from '@/shared/lib/constants/us-states';
```

The form JSX layout (fields in order):

1. **Name** — `<Input>` required
2. **Phone** — `<Input type="tel">` required (was optional)
3. **Email** — `<Input type="email">` required (was optional)
4. **CDL Class** — `<Select>` with options from `CDL_CLASSES` — required
5. **License Number** — `<Input>` required
6. **License State** — `<Select>` with options from `US_STATES` — optional

Put CDL Class and License Number side-by-side in a `grid grid-cols-1 md:grid-cols-2 gap-4` row. Put License State as a half-width field below.

**Step 2: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "feat(ui): redesign create driver dialog with CDL class and required fields"
```

---

### Task 8: Frontend — Redesign Driver List View as Dispatch Roster

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx` (the `DriversTab` function, lines 145-416)

**Step 1: Update table columns**

Replace the `<Table>` section in DriversTab. New columns:

1. **Driver** — Name (bold, clickable link to profile) + Phone (muted)
2. **CDL** — Badge with value A/B/C
3. **Status** — Badge (Active/Inactive/Pending)
4. **HOS** — Mini progress bar showing drive_remaining/11h (use `current_hos` data). Hidden on mobile (`hidden md:table-cell`)
5. **Vehicle** — Placeholder "Unassigned" for now (vehicle assignment will come from relations). Hidden on mobile+tablet (`hidden lg:table-cell`)
6. **Current Load** — From `current_load` relation or "—". Hidden on mobile+tablet (`hidden lg:table-cell`)
7. **SALLY** — Access badge + Invite button. Hidden on mobile (`hidden md:table-cell`)
8. **Actions** — Dropdown menu with View Profile, Edit, Delete options

Add imports needed:
```typescript
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Progress } from '@/shared/components/ui/progress';
```

Add `useRouter` import for navigation:
```typescript
import { useRouter } from 'next/navigation';
```

Use `router.push(`/dispatcher/fleet/drivers/${driver.driver_id}`)` for profile navigation.

For the HOS column, calculate drive hours remaining:
```typescript
const driveRemaining = driver.current_hos?.drive_remaining ?? (11 - (driver.current_hours_driven ?? 0));
const hosPercent = Math.max(0, Math.min(100, (driveRemaining / 11) * 100));
```

Show a small `<Progress value={hosPercent} />` with the hours text next to it.

**Step 2: Check if DropdownMenu component exists, install if needed**

Run:
```bash
ls apps/web/src/shared/components/ui/dropdown-menu.tsx 2>/dev/null || (cd apps/web && npx shadcn@latest add dropdown-menu)
```

**Step 3: Check if Progress component exists, install if needed**

Run:
```bash
ls apps/web/src/shared/components/ui/progress.tsx 2>/dev/null || (cd apps/web && npx shadcn@latest add progress)
```

**Step 4: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx apps/web/src/shared/components/ui/
git commit -m "feat(ui): redesign driver list as dispatch roster with HOS bars and CDL badges"
```

---

### Task 9: Frontend — Create Driver Profile Page

**Files:**
- Create: `apps/web/src/app/dispatcher/fleet/drivers/[driverId]/page.tsx`

**Step 1: Create the directory structure**

Run:
```bash
mkdir -p apps/web/src/app/dispatcher/fleet/drivers/\[driverId\]
```

**Step 2: Create the profile page**

This is a client component that:
- Fetches a single driver using `useDriverById(driverId)` hook
- Fetches HOS data using `useDriverHOS(driverId)` hook
- Displays 6 card sections in a responsive grid

**Page structure:**

```tsx
'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDriverById, useDriverHOS } from '@/features/fleet/drivers';
import { InviteDriverDialog } from '@/features/fleet/drivers';
// ... shadcn imports for Card, Badge, Progress, Button, etc.
// ... constants imports for US_STATES, CDL_CLASSES, ENDORSEMENT_OPTIONS
// ... lucide icons: ArrowLeft, Pencil, Phone, Mail, Shield, Truck, Package, Clock, MapPin, AlertTriangle, User

export default function DriverProfilePage({ params }: { params: Promise<{ driverId: string }> }) {
  const { driverId } = use(params);
  const { data: driver, isLoading, error } = useDriverById(driverId);
  const { data: hos } = useDriverHOS(driverId);
  // ... state for edit dialog, invite dialog

  // Loading/error states

  return (
    <div className="space-y-6">
      {/* Header: Back link + Driver name + Status + Edit button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dispatcher/fleet" className="...">
            <ArrowLeft className="h-4 w-4" /> Back to Fleet
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{driver.name}</h1>
          <Badge>{driver.status}</Badge>
        </div>
        <Button onClick={openEditDialog}>
          <Pencil className="h-4 w-4 mr-2" /> Edit
        </Button>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Personal Info Card */}
        <Card>...</Card>

        {/* HOS Status Card */}
        <Card>
          {/* 3 progress bars: Drive (X/11h), Shift (X/14h), Cycle (X/70h) */}
          {/* Break required indicator */}
          {/* Data source + last sync */}
        </Card>

        {/* Compliance Card */}
        <Card>
          {/* CDL Class badge, License # + State */}
          {/* Endorsements as badge list */}
          {/* Medical Card Expiry with relative time + color */}
          {/* Hire Date */}
        </Card>

        {/* Operations Card */}
        <Card>
          {/* Home Terminal city, state */}
          {/* Timezone */}
          {/* Assigned Vehicle (link or "Unassigned") */}
          {/* Current Load (link + status badge or "—") */}
          {/* SALLY Access status */}
        </Card>
      </div>

      {/* Notes Card (full width) */}
      <Card className="col-span-full">
        {/* Editable textarea or display */}
      </Card>

      {/* Integration Card (full width, conditional) */}
      {driver.external_source && (
        <Card className="col-span-full">
          {/* External ID, Source, Sync Status, Last Synced */}
        </Card>
      )}

      {/* Edit Driver Dialog (Tier 2) */}
      {/* Invite Driver Dialog */}
    </div>
  );
}
```

**Key implementation details:**

- Use `use(params)` for Next.js 15 App Router param unwrapping
- Medical card expiry: calculate days until expiry. If <= 30 days, show red badge "Expiring". If past, show destructive badge "EXPIRED".
- HOS progress bars use `<Progress>` from shadcn with proper dark theme colors
- All text uses semantic tokens (`text-foreground`, `text-muted-foreground`)
- Responsive: `grid-cols-1 md:grid-cols-2` for the card grid
- Each field label uses `text-sm text-muted-foreground` and value uses `text-foreground`

**Step 3: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/drivers/
git commit -m "feat(ui): add driver profile page with personal, compliance, HOS, and operations sections"
```

---

### Task 10: Frontend — Edit Driver Dialog (Tier 2) on Profile Page

**Files:**
- Create: `apps/web/src/features/fleet/drivers/components/edit-driver-dialog.tsx`
- Modify: `apps/web/src/features/fleet/drivers/index.ts` (add export)

**Step 1: Create the edit dialog component**

This is a Tier 2 dialog (`max-w-2xl`) with a 2-column grid layout for editing ALL driver fields:

```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useUpdateDriver, type Driver, type UpdateDriverRequest } from '@/features/fleet/drivers';
import { US_STATES, CDL_CLASSES, ENDORSEMENT_OPTIONS } from '@/shared/lib/constants/us-states';

interface EditDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver;
}

export default function EditDriverDialog({ open, onOpenChange, driver }: EditDriverDialogProps) {
  // Form state initialized from driver
  // 2-column grid layout with sections
  // Endorsements as checkboxes
  // Medical card expiry as date input
  // Hire date as date input
  // Notes as Textarea
  // Submit calls useUpdateDriver hook
}
```

**Layout sections in the dialog:**

```
Row 1: Name (full width)
Row 2: Phone | Email (2-col)
Row 3: CDL Class | License # (2-col)
Row 4: License State | (empty) (2-col, half)
---separator---
Row 5: Endorsements (full width, checkboxes inline)
Row 6: Hire Date | Medical Card Expiry (2-col)
---separator---
Row 7: Home Terminal City | Home Terminal State (2-col)
---separator---
Row 8: Emergency Contact Name | Emergency Contact Phone (2-col)
---separator---
Row 9: Notes (full width, Textarea)
```

**Step 2: Check if Textarea and Checkbox exist, install if needed**

Run:
```bash
ls apps/web/src/shared/components/ui/textarea.tsx 2>/dev/null || (cd apps/web && npx shadcn@latest add textarea)
ls apps/web/src/shared/components/ui/checkbox.tsx 2>/dev/null || (cd apps/web && npx shadcn@latest add checkbox)
```

**Step 3: Add export to index.ts**

Add to `apps/web/src/features/fleet/drivers/index.ts`:

```typescript
export { default as EditDriverDialog } from './components/edit-driver-dialog';
```

**Step 4: Import and use EditDriverDialog in the profile page**

Update `apps/web/src/app/dispatcher/fleet/drivers/[driverId]/page.tsx` to import and render the edit dialog.

**Step 5: Commit**

```bash
git add apps/web/src/features/fleet/drivers/components/edit-driver-dialog.tsx
git add apps/web/src/features/fleet/drivers/index.ts
git add apps/web/src/app/dispatcher/fleet/drivers/
git add apps/web/src/shared/components/ui/
git commit -m "feat(ui): add Tier 2 edit driver dialog with all profile fields"
```

---

### Task 11: Update DriverSelector for CDL Badge

**Files:**
- Modify: `apps/web/src/app/dispatcher/create-plan/components/DriverSelector.tsx`

**Step 1: Add CDL class badge to driver selector dropdown**

In each `<SelectItem>`, after the driver name, add a small CDL badge:

```tsx
<SelectItem key={driver.driver_id} value={driver.driver_id}>
  <div className="flex items-center justify-between w-full">
    <div className="flex items-center gap-2">
      <span>{driver.name}</span>
      {driver.cdl_class && (
        <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">
          CDL-{driver.cdl_class}
        </span>
      )}
    </div>
    {/* existing HOS indicator */}
  </div>
</SelectItem>
```

**Step 2: Commit**

```bash
git add apps/web/src/app/dispatcher/create-plan/components/DriverSelector.tsx
git commit -m "feat(ui): add CDL class badge to driver selector dropdown"
```

---

### Task 12: Verify and Test

**Step 1: Build backend**

Run:
```bash
cd apps/backend && npm run build
```

Expected: Compiles without errors.

**Step 2: Build frontend**

Run:
```bash
cd apps/web && npm run build
```

Expected: Compiles without errors.

**Step 3: Run type checks**

Run:
```bash
cd apps/web && npx tsc --noEmit
```

Expected: No type errors.

**Step 4: Manual verification checklist**

- [ ] Create driver dialog has 5 required fields + License State optional
- [ ] Driver list shows CDL badge, Status badge, HOS bar columns
- [ ] Clicking driver name navigates to profile page
- [ ] Profile page shows all 6 card sections
- [ ] Edit dialog opens as Tier 2 with 2-column layout
- [ ] All fields save correctly via API
- [ ] Dark theme works on all new components
- [ ] Responsive layout: mobile shows Driver+CDL+Status+Actions only

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: driver management UX redesign - complete implementation"
```
