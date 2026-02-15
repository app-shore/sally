# Vehicle Management UX Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add vehicle status, equipment type, VIN requirement, and progressive disclosure form to the vehicle management UX so dispatchers can add a truck in 15 seconds and see operational readiness at a glance.

**Architecture:** Schema-first approach — add Prisma enums and fields, generate migration, update backend DTOs/service/controller, then update frontend types/API/form/list. Each layer tested before moving to next.

**Tech Stack:** Prisma 7.3, NestJS 11, Next.js 15, Shadcn UI (Collapsible, RadioGroup, Select), TailwindCSS, React Query

**Design doc:** `.docs/plans/2026-02-13-vehicle-management-ux-design.md`

---

## Task 1: Add Prisma Enums and Schema Fields

**Files:**
- Modify: `apps/backend/prisma/schema.prisma:375-418`

**Step 1: Add VehicleStatus and EquipmentType enums**

Insert these enums BEFORE the Vehicle model (after line 374, before `model Vehicle`):

```prisma
enum VehicleStatus {
  AVAILABLE
  ASSIGNED
  IN_SHOP
  OUT_OF_SERVICE
}

enum EquipmentType {
  DRY_VAN
  FLATBED
  REEFER
  STEP_DECK
  POWER_ONLY
  OTHER
}
```

**Step 2: Add new fields to Vehicle model**

Add these fields to the Vehicle model (after `licensePlate` on line 397, before the ELD comment on line 399):

```prisma
  licensePlateState     String?      @map("license_plate_state") @db.VarChar(2)
```

Add these fields after `grossWeightLbs` (line 403), before the tenant relation (line 405):

```prisma
  status                VehicleStatus @default(AVAILABLE)
  equipmentType         EquipmentType @map("equipment_type")
```

Change `vin` from optional to required (line 396):

```prisma
  vin                   String       @db.VarChar(17)
```

Also change `fuelCapacityGallons` from optional to required (line 380):

```prisma
  fuelCapacityGallons   Float        @map("fuel_capacity_gallons")
```

Add unique index for VIN per tenant. Update the indexes section (after line 416):

```prisma
  @@unique([vin, tenantId])
```

**Step 3: Generate and apply migration**

Run:
```bash
cd apps/backend && npx prisma migrate dev --name add_vehicle_status_equipment_type
```

This will prompt about making `vin` required. For existing rows, the migration SQL should backfill:
- `vin`: Set to `'UNKNOWN-' || id` for any null VINs
- `equipment_type`: Set to `'DRY_VAN'` for all existing vehicles
- `status`: Already has default `AVAILABLE`
- `fuel_capacity_gallons`: Set to `150` for any null values

If Prisma cannot auto-generate the migration due to nullable→required changes, create a custom migration with these SQL steps BEFORE the ALTER:

```sql
-- Backfill nulls before making columns required
UPDATE vehicles SET vin = 'UNKNOWN-' || id WHERE vin IS NULL;
UPDATE vehicles SET fuel_capacity_gallons = 150 WHERE fuel_capacity_gallons IS NULL;
-- Then ALTER TABLE to add NOT NULL constraints
```

**Step 4: Generate Prisma client**

Run:
```bash
cd apps/backend && npx prisma generate
```

**Step 5: Commit**

```bash
git add apps/backend/prisma/
git commit -m "feat(schema): add VehicleStatus, EquipmentType enums and new vehicle fields"
```

---

## Task 2: Update Backend DTOs

**Files:**
- Modify: `apps/backend/src/domains/fleet/vehicles/dto/create-vehicle.dto.ts`
- Modify: `apps/backend/src/domains/fleet/vehicles/dto/update-vehicle.dto.ts`

**Step 1: Update CreateVehicleDto**

Replace the entire file content with:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Length,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateVehicleDto {
  @ApiProperty({ example: 'TRUCK-101', description: 'Vehicle unit number' })
  @IsString()
  @IsNotEmpty()
  unit_number: string;

  @ApiProperty({ example: '1FUJGBDV7CLBP8834', description: 'Vehicle identification number (17 characters)' })
  @IsString()
  @IsNotEmpty()
  @Length(17, 17, { message: 'VIN must be exactly 17 characters' })
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/i, { message: 'VIN must contain only valid characters (no I, O, Q)' })
  @Transform(({ value }) => value?.toUpperCase().replace(/\s/g, ''))
  vin: string;

  @ApiProperty({ example: 'DRY_VAN', description: 'Equipment type', enum: ['DRY_VAN', 'FLATBED', 'REEFER', 'STEP_DECK', 'POWER_ONLY', 'OTHER'] })
  @IsEnum(['DRY_VAN', 'FLATBED', 'REEFER', 'STEP_DECK', 'POWER_ONLY', 'OTHER'], { message: 'Invalid equipment type' })
  @IsNotEmpty()
  equipment_type: string;

  @ApiProperty({ example: 150, description: 'Fuel tank capacity in gallons' })
  @IsNumber()
  @Min(1)
  @Max(500)
  fuel_capacity_gallons: number;

  @ApiProperty({ example: 6.5, description: 'Miles per gallon efficiency', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  mpg?: number;

  @ApiProperty({ example: 'AVAILABLE', description: 'Vehicle operational status', enum: ['AVAILABLE', 'IN_SHOP', 'OUT_OF_SERVICE'], required: false })
  @IsEnum(['AVAILABLE', 'IN_SHOP', 'OUT_OF_SERVICE'], { message: 'Invalid status for creation. Use AVAILABLE, IN_SHOP, or OUT_OF_SERVICE.' })
  @IsOptional()
  status?: string;

  @ApiProperty({ example: 'Freightliner', description: 'Vehicle make', required: false })
  @IsString()
  @IsOptional()
  make?: string;

  @ApiProperty({ example: 'Cascadia', description: 'Vehicle model', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ example: 2024, description: 'Vehicle year', required: false })
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiProperty({ example: 'ABC-1234', description: 'License plate number', required: false })
  @IsString()
  @IsOptional()
  license_plate?: string;

  @ApiProperty({ example: 'TX', description: 'License plate state (2-letter code)', required: false })
  @IsString()
  @IsOptional()
  @Length(2, 2, { message: 'State must be a 2-letter code' })
  @Transform(({ value }) => value?.toUpperCase())
  license_plate_state?: string;

  @ApiProperty({ example: true, description: 'Whether vehicle has sleeper berth', required: false })
  @IsBoolean()
  @IsOptional()
  has_sleeper_berth?: boolean;

  @ApiProperty({ example: 80000, description: 'Gross vehicle weight in pounds', required: false })
  @IsNumber()
  @IsOptional()
  gross_weight_lbs?: number;

  @ApiProperty({ example: 100, description: 'Current fuel level in gallons', required: false })
  @IsNumber()
  @IsOptional()
  current_fuel_gallons?: number;
}
```

**Step 2: Update UpdateVehicleDto**

Replace the entire file content with:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  Length,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateVehicleDto {
  @ApiProperty({ example: 'TRUCK-456', description: 'Vehicle unit number', required: false })
  @IsString()
  @IsOptional()
  unit_number?: string;

  @ApiProperty({ example: '1FUJGBDV7CLBP8834', description: 'Vehicle identification number (17 characters)', required: false })
  @IsString()
  @IsOptional()
  @Length(17, 17, { message: 'VIN must be exactly 17 characters' })
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/i, { message: 'VIN must contain only valid characters (no I, O, Q)' })
  @Transform(({ value }) => value?.toUpperCase().replace(/\s/g, ''))
  vin?: string;

  @ApiProperty({ example: 'DRY_VAN', description: 'Equipment type', enum: ['DRY_VAN', 'FLATBED', 'REEFER', 'STEP_DECK', 'POWER_ONLY', 'OTHER'], required: false })
  @IsEnum(['DRY_VAN', 'FLATBED', 'REEFER', 'STEP_DECK', 'POWER_ONLY', 'OTHER'], { message: 'Invalid equipment type' })
  @IsOptional()
  equipment_type?: string;

  @ApiProperty({ example: 150, description: 'Fuel tank capacity in gallons', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  fuel_capacity_gallons?: number;

  @ApiProperty({ example: 6.5, description: 'Miles per gallon efficiency', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(20)
  mpg?: number;

  @ApiProperty({ example: 'AVAILABLE', description: 'Vehicle operational status', enum: ['AVAILABLE', 'ASSIGNED', 'IN_SHOP', 'OUT_OF_SERVICE'], required: false })
  @IsEnum(['AVAILABLE', 'ASSIGNED', 'IN_SHOP', 'OUT_OF_SERVICE'], { message: 'Invalid status' })
  @IsOptional()
  status?: string;

  @ApiProperty({ example: 'Freightliner', description: 'Vehicle make', required: false })
  @IsString()
  @IsOptional()
  make?: string;

  @ApiProperty({ example: 'Cascadia', description: 'Vehicle model', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ example: 2024, description: 'Vehicle year', required: false })
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiProperty({ example: 'ABC-1234', description: 'License plate number', required: false })
  @IsString()
  @IsOptional()
  license_plate?: string;

  @ApiProperty({ example: 'TX', description: 'License plate state (2-letter code)', required: false })
  @IsString()
  @IsOptional()
  @Length(2, 2, { message: 'State must be a 2-letter code' })
  @Transform(({ value }) => value?.toUpperCase())
  license_plate_state?: string;

  @ApiProperty({ example: true, description: 'Whether vehicle has sleeper berth', required: false })
  @IsBoolean()
  @IsOptional()
  has_sleeper_berth?: boolean;

  @ApiProperty({ example: 80000, description: 'Gross vehicle weight in pounds', required: false })
  @IsNumber()
  @IsOptional()
  gross_weight_lbs?: number;

  @ApiProperty({ example: 100, description: 'Current fuel level in gallons', required: false })
  @IsNumber()
  @IsOptional()
  current_fuel_gallons?: number;
}
```

**Step 3: Commit**

```bash
git add apps/backend/src/domains/fleet/vehicles/dto/
git commit -m "feat(vehicles): update DTOs with status, equipment type, VIN validation"
```

---

## Task 3: Update Backend Service

**Files:**
- Modify: `apps/backend/src/domains/fleet/vehicles/services/vehicles.service.ts`

**Step 1: Update the create method**

Update the `create` method to handle new fields. The `data` parameter type and `prisma.vehicle.create` call need updating:

```typescript
async create(
  tenantId: number,
  data: {
    unit_number: string;
    vin: string;
    equipment_type: string;
    fuel_capacity_gallons: number;
    mpg?: number;
    status?: string;
    make?: string;
    model?: string;
    year?: number;
    license_plate?: string;
    license_plate_state?: string;
    has_sleeper_berth?: boolean;
    gross_weight_lbs?: number;
    current_fuel_gallons?: number;
  },
): Promise<Vehicle> {
  const vehicleId = `VEH-${Date.now().toString(36).toUpperCase()}`;

  try {
    const vehicle = await this.prisma.vehicle.create({
      data: {
        vehicleId,
        unitNumber: data.unit_number,
        vin: data.vin,
        equipmentType: data.equipment_type as any,
        fuelCapacityGallons: data.fuel_capacity_gallons,
        mpg: data.mpg,
        status: (data.status as any) || 'AVAILABLE',
        make: data.make || null,
        model: data.model || null,
        year: data.year || null,
        licensePlate: data.license_plate || null,
        licensePlateState: data.license_plate_state || null,
        hasSleeperBerth: data.has_sleeper_berth ?? true,
        grossWeightLbs: data.gross_weight_lbs || null,
        currentFuelGallons: data.current_fuel_gallons,
        isActive: true,
        tenantId,
      },
    });

    this.logger.log(`Vehicle created: ${vehicleId} - ${data.unit_number}`);
    return vehicle;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ConflictException('Vehicle with this VIN or ID already exists');
    }
    throw error;
  }
}
```

**Step 2: Update the update method**

Update the `update` method data parameter and Prisma call:

```typescript
async update(
  vehicleId: string,
  tenantId: number,
  data: {
    unit_number?: string;
    vin?: string;
    equipment_type?: string;
    fuel_capacity_gallons?: number;
    mpg?: number;
    status?: string;
    make?: string;
    model?: string;
    year?: number;
    license_plate?: string;
    license_plate_state?: string;
    has_sleeper_berth?: boolean;
    gross_weight_lbs?: number;
    current_fuel_gallons?: number;
  },
): Promise<Vehicle> {
  try {
    const vehicle = await this.prisma.vehicle.update({
      where: {
        vehicleId_tenantId: {
          vehicleId,
          tenantId,
        },
      },
      data: {
        ...(data.unit_number !== undefined ? { unitNumber: data.unit_number } : {}),
        ...(data.vin !== undefined ? { vin: data.vin } : {}),
        ...(data.equipment_type !== undefined ? { equipmentType: data.equipment_type as any } : {}),
        ...(data.fuel_capacity_gallons !== undefined ? { fuelCapacityGallons: data.fuel_capacity_gallons } : {}),
        ...(data.mpg !== undefined ? { mpg: data.mpg } : {}),
        ...(data.status !== undefined ? { status: data.status as any } : {}),
        ...(data.make !== undefined ? { make: data.make } : {}),
        ...(data.model !== undefined ? { model: data.model } : {}),
        ...(data.year !== undefined ? { year: data.year } : {}),
        ...(data.license_plate !== undefined ? { licensePlate: data.license_plate } : {}),
        ...(data.license_plate_state !== undefined ? { licensePlateState: data.license_plate_state } : {}),
        ...(data.has_sleeper_berth !== undefined ? { hasSleeperBerth: data.has_sleeper_berth } : {}),
        ...(data.gross_weight_lbs !== undefined ? { grossWeightLbs: data.gross_weight_lbs } : {}),
        ...(data.current_fuel_gallons !== undefined ? { currentFuelGallons: data.current_fuel_gallons } : {}),
      },
    });

    this.logger.log(`Vehicle updated: ${vehicleId}`);
    return vehicle;
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ConflictException('Vehicle with this VIN already exists');
    }
    throw error;
  }
}
```

**Step 3: Commit**

```bash
git add apps/backend/src/domains/fleet/vehicles/services/
git commit -m "feat(vehicles): update service with new fields and VIN conflict handling"
```

---

## Task 4: Update Backend Controller

**Files:**
- Modify: `apps/backend/src/domains/fleet/vehicles/controllers/vehicles.controller.ts`

**Step 1: Update the response mapping in all endpoints**

Update `listVehicles`, `createVehicle`, and `updateVehicle` to include the new fields in responses.

The response object in `listVehicles` (the `map` callback) should become:

```typescript
return vehicles.map((vehicle) => ({
  id: vehicle.id,
  vehicle_id: vehicle.vehicleId,
  unit_number: vehicle.unitNumber,
  vin: vehicle.vin,
  equipment_type: vehicle.equipmentType,
  status: vehicle.status,
  make: vehicle.make,
  model: vehicle.model,
  year: vehicle.year,
  license_plate: vehicle.licensePlate,
  license_plate_state: vehicle.licensePlateState,
  has_sleeper_berth: vehicle.hasSleeperBerth,
  gross_weight_lbs: vehicle.grossWeightLbs,
  fuel_capacity_gallons: vehicle.fuelCapacityGallons,
  current_fuel_gallons: vehicle.currentFuelGallons,
  mpg: vehicle.mpg,
  external_vehicle_id: vehicle.externalVehicleId,
  external_source: vehicle.externalSource,
  last_synced_at: vehicle.lastSyncedAt?.toISOString(),
  created_at: vehicle.createdAt.toISOString(),
  updated_at: vehicle.updatedAt.toISOString(),
}));
```

**Step 2: Update createVehicle to pass new fields to service**

```typescript
const vehicle = await this.vehiclesService.create(tenantDbId, {
  unit_number: createVehicleDto.unit_number,
  vin: createVehicleDto.vin,
  equipment_type: createVehicleDto.equipment_type,
  fuel_capacity_gallons: createVehicleDto.fuel_capacity_gallons,
  mpg: createVehicleDto.mpg,
  status: createVehicleDto.status,
  make: createVehicleDto.make,
  model: createVehicleDto.model,
  year: createVehicleDto.year,
  license_plate: createVehicleDto.license_plate,
  license_plate_state: createVehicleDto.license_plate_state,
  has_sleeper_berth: createVehicleDto.has_sleeper_berth,
  gross_weight_lbs: createVehicleDto.gross_weight_lbs,
  current_fuel_gallons: createVehicleDto.current_fuel_gallons,
});
```

Return response should include all new fields (same shape as list response).

**Step 3: Update updateVehicle to pass new fields to service**

Same pattern as createVehicle — pass all new DTO fields through to the service.

**Step 4: Commit**

```bash
git add apps/backend/src/domains/fleet/vehicles/controllers/
git commit -m "feat(vehicles): update controller responses with status, equipment type, new fields"
```

---

## Task 5: Update Frontend Types and API

**Files:**
- Modify: `apps/web/src/features/fleet/vehicles/types.ts`
- Modify: `apps/web/src/features/fleet/vehicles/api.ts` (no changes needed, just verify)

**Step 1: Update Vehicle interface and request types**

Replace `apps/web/src/features/fleet/vehicles/types.ts` with:

```typescript
export type VehicleStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_SHOP' | 'OUT_OF_SERVICE';

export type EquipmentType = 'DRY_VAN' | 'FLATBED' | 'REEFER' | 'STEP_DECK' | 'POWER_ONLY' | 'OTHER';

export interface Vehicle {
  id: string;
  vehicle_id: string;
  unit_number: string;
  vin: string;
  equipment_type: EquipmentType;
  status: VehicleStatus;
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  license_plate_state?: string;
  has_sleeper_berth?: boolean;
  gross_weight_lbs?: number;
  fuel_capacity_gallons: number;
  current_fuel_gallons?: number;
  mpg?: number;
  external_vehicle_id?: string;
  external_source?: string;
  last_synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateVehicleRequest {
  unit_number: string;
  vin: string;
  equipment_type: EquipmentType;
  fuel_capacity_gallons: number;
  mpg?: number;
  status?: VehicleStatus;
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  license_plate_state?: string;
  has_sleeper_berth?: boolean;
  gross_weight_lbs?: number;
  current_fuel_gallons?: number;
}

export interface UpdateVehicleRequest {
  unit_number?: string;
  vin?: string;
  equipment_type?: EquipmentType;
  fuel_capacity_gallons?: number;
  mpg?: number;
  status?: VehicleStatus;
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  license_plate_state?: string;
  has_sleeper_berth?: boolean;
  gross_weight_lbs?: number;
  current_fuel_gallons?: number;
}
```

**Step 2: Verify API layer**

The `api.ts` file uses generic types (`CreateVehicleRequest`, `UpdateVehicleRequest`) — no changes needed. Just verify it still compiles.

**Step 3: Update index.ts barrel exports**

Add the new type exports to `apps/web/src/features/fleet/vehicles/index.ts`:

```typescript
export type { Vehicle, CreateVehicleRequest, UpdateVehicleRequest, VehicleStatus, EquipmentType } from './types';
```

**Step 4: Commit**

```bash
git add apps/web/src/features/fleet/vehicles/
git commit -m "feat(vehicles): update frontend types with status, equipment type, new fields"
```

---

## Task 6: Redesign Vehicle Form with Progressive Disclosure

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx` (the `VehicleForm` function, lines 825-973)

**Step 1: Add imports at top of file**

Add these imports to the existing import block at the top of `page.tsx`:

```typescript
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';
```

Also add `ChevronDown` to the existing `lucide-react` import if it isn't already there. The existing import has `Lock, Plus, RefreshCw, Settings, Package` — add `ChevronDown` to that list.

**Step 2: Replace the VehicleForm function**

Replace the entire `VehicleForm` function (lines 825-973) with:

```tsx
function VehicleForm({
  vehicle,
  onSuccess,
  onCancel,
}: {
  vehicle: Vehicle | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<CreateVehicleRequest>({
    unit_number: vehicle?.unit_number || '',
    vin: vehicle?.vin || '',
    equipment_type: vehicle?.equipment_type || undefined as any,
    fuel_capacity_gallons: vehicle?.fuel_capacity_gallons || ('' as any),
    mpg: vehicle?.mpg || undefined,
    status: vehicle?.status || 'AVAILABLE',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year || undefined,
    license_plate: vehicle?.license_plate || '',
    license_plate_state: vehicle?.license_plate_state || '',
    has_sleeper_berth: vehicle?.has_sleeper_berth ?? true,
    gross_weight_lbs: vehicle?.gross_weight_lbs || undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  // Auto-expand "More Details" when editing a vehicle that has optional fields filled
  useEffect(() => {
    if (vehicle && (vehicle.make || vehicle.model || vehicle.license_plate)) {
      setShowMore(true);
    }
  }, [vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // VIN validation
    const cleanVin = formData.vin?.toUpperCase().replace(/\s/g, '') || '';
    if (cleanVin.length !== 17) {
      setError('VIN must be exactly 17 characters');
      setIsSubmitting(false);
      return;
    }

    const submitData = {
      ...formData,
      vin: cleanVin,
      // Clean up empty optional strings
      make: formData.make || undefined,
      model: formData.model || undefined,
      license_plate: formData.license_plate || undefined,
      license_plate_state: formData.license_plate_state || undefined,
    };

    try {
      if (vehicle) {
        await updateVehicle(vehicle.vehicle_id, submitData);
      } else {
        await createVehicle(submitData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const equipmentTypes = [
    { value: 'DRY_VAN', label: 'Dry Van' },
    { value: 'FLATBED', label: 'Flatbed' },
    { value: 'REEFER', label: 'Reefer' },
    { value: 'STEP_DECK', label: 'Step Deck' },
    { value: 'POWER_ONLY', label: 'Power Only' },
    { value: 'OTHER', label: 'Other' },
  ];

  const usStates = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
    'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
    'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
    'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* === Essential Fields === */}
      <div>
        <Label htmlFor="unit_number">Unit Number *</Label>
        <Input
          id="unit_number"
          value={formData.unit_number}
          onChange={(e) =>
            setFormData({ ...formData, unit_number: e.target.value })
          }
          placeholder="e.g. TRUCK-101"
          required
        />
      </div>

      <div>
        <Label htmlFor="vin">VIN *</Label>
        <Input
          id="vin"
          value={formData.vin}
          onChange={(e) =>
            setFormData({ ...formData, vin: e.target.value.toUpperCase().replace(/\s/g, '') })
          }
          placeholder="17-character VIN"
          maxLength={17}
          required
        />
        {formData.vin && formData.vin.length > 0 && formData.vin.length !== 17 && (
          <p className="text-xs text-muted-foreground mt-1">
            {formData.vin.length}/17 characters
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="equipment_type">Equipment Type *</Label>
        <Select
          value={formData.equipment_type}
          onValueChange={(value) =>
            setFormData({ ...formData, equipment_type: value as any })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select equipment type" />
          </SelectTrigger>
          <SelectContent>
            {equipmentTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fuel_capacity">Fuel Capacity (gal) *</Label>
          <Input
            id="fuel_capacity"
            type="number"
            step="1"
            min="1"
            max="500"
            value={formData.fuel_capacity_gallons || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                fuel_capacity_gallons: parseFloat(e.target.value) || ('' as any),
              })
            }
            placeholder="e.g. 150"
            required
          />
        </div>

        <div>
          <Label htmlFor="mpg">MPG</Label>
          <Input
            id="mpg"
            type="number"
            step="0.1"
            min="1"
            max="20"
            value={formData.mpg || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                mpg: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            placeholder="e.g. 6.5"
          />
        </div>
      </div>

      <div>
        <Label className="mb-3 block">Status</Label>
        <RadioGroup
          value={formData.status || 'AVAILABLE'}
          onValueChange={(value) =>
            setFormData({ ...formData, status: value as any })
          }
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="AVAILABLE" id="status-available" />
            <Label htmlFor="status-available" className="font-normal cursor-pointer">
              Available
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="IN_SHOP" id="status-in-shop" />
            <Label htmlFor="status-in-shop" className="font-normal cursor-pointer">
              In Shop
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="OUT_OF_SERVICE" id="status-oos" />
            <Label htmlFor="status-oos" className="font-normal cursor-pointer">
              Out of Service
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* === More Details (Collapsible) === */}
      <Collapsible open={showMore} onOpenChange={setShowMore}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-between text-muted-foreground hover:text-foreground"
          >
            More Details
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {/* Vehicle Info */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Vehicle Info
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) =>
                    setFormData({ ...formData, make: e.target.value })
                  }
                  placeholder="e.g. Freightliner"
                />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  placeholder="e.g. Cascadia"
                />
              </div>
            </div>
            <div className="w-1/2 pr-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                min="1990"
                max={new Date().getFullYear() + 1}
                value={formData.year || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    year: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="e.g. 2024"
              />
            </div>
          </div>

          {/* Registration */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Registration
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="license_plate">License Plate</Label>
                <Input
                  id="license_plate"
                  value={formData.license_plate}
                  onChange={(e) =>
                    setFormData({ ...formData, license_plate: e.target.value })
                  }
                  placeholder="e.g. ABC-1234"
                />
              </div>
              <div>
                <Label htmlFor="license_plate_state">State</Label>
                <Select
                  value={formData.license_plate_state}
                  onValueChange={(value) =>
                    setFormData({ ...formData, license_plate_state: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {usStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Specifications
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="has_sleeper_berth"
                  checked={formData.has_sleeper_berth ?? true}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, has_sleeper_berth: !!checked })
                  }
                />
                <Label htmlFor="has_sleeper_berth" className="font-normal cursor-pointer">
                  Has Sleeper Berth
                </Label>
              </div>
              <div>
                <Label htmlFor="gross_weight_lbs">GVW (lbs)</Label>
                <Input
                  id="gross_weight_lbs"
                  type="number"
                  min="10000"
                  max="80000"
                  value={formData.gross_weight_lbs || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gross_weight_lbs: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="e.g. 80000"
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : vehicle ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
```

**Step 3: Add the `useEffect` import**

Verify `useEffect` is already imported at line 3 — it should be: `import { useState, useEffect } from 'react';`. If not, add it.

**Step 4: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "feat(vehicles): redesign form with progressive disclosure, status radio, equipment type select"
```

---

## Task 7: Redesign Vehicle List Table

**Files:**
- Modify: `apps/web/src/app/dispatcher/fleet/page.tsx` (the AssetsTab trucks table, lines 682-770)

**Step 1: Replace the table header and body**

Replace the `<Table>` block inside the trucks tab (the one inside `vehicles.length === 0 ? ... : (` block) with:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Unit Number</TableHead>
      <TableHead>Type</TableHead>
      <TableHead>Make/Model</TableHead>
      <TableHead>Fuel / MPG</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Source</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {vehicles.map((vehicle) => (
      <TableRow key={vehicle.id}>
        <TableCell className="font-medium text-foreground">
          {vehicle.unit_number}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">
            {formatEquipmentType(vehicle.equipment_type)}
          </Badge>
        </TableCell>
        <TableCell className="text-foreground">
          {vehicle.make && vehicle.model
            ? `${vehicle.make} ${vehicle.model}`
            : vehicle.make || vehicle.model || '—'}
        </TableCell>
        <TableCell className="text-foreground text-sm">
          {vehicle.fuel_capacity_gallons} gal
          {vehicle.mpg ? ` · ${vehicle.mpg} mpg` : ''}
        </TableCell>
        <TableCell>
          <VehicleStatusBadge status={vehicle.status} />
        </TableCell>
        <TableCell>
          {vehicle.external_source ? (
            <Badge variant="muted" className="gap-1">
              <span className="text-xs">🔗</span>
              {getSourceLabel(vehicle.external_source)}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <span className="text-xs">✋</span>
              Manual
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          {vehicle.external_source ? (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled
                className="opacity-50 cursor-not-allowed"
                title={`Read-only - synced from ${getSourceLabel(vehicle.external_source)}`}
              >
                <Lock className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled
                className="opacity-50 cursor-not-allowed"
                title={`Read-only - synced from ${getSourceLabel(vehicle.external_source)}`}
              >
                <Lock className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(vehicle)}
                className="mr-2"
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteConfirm(vehicle.vehicle_id)}
              >
                Delete
              </Button>
            </>
          )}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Step 2: Add helper components before `getSourceLabel`**

Add these helper functions before the `getSourceLabel` function at the bottom of the file:

```tsx
function VehicleStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'AVAILABLE':
      return (
        <Badge variant="outline" className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-400">
          Available
        </Badge>
      );
    case 'ASSIGNED':
      return (
        <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-transparent">
          Assigned
        </Badge>
      );
    case 'IN_SHOP':
      return (
        <Badge variant="outline" className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400">
          In Shop
        </Badge>
      );
    case 'OUT_OF_SERVICE':
      return (
        <Badge variant="outline" className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-400">
          Out of Service
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatEquipmentType(type: string): string {
  const labels: Record<string, string> = {
    DRY_VAN: 'Dry Van',
    FLATBED: 'Flatbed',
    REEFER: 'Reefer',
    STEP_DECK: 'Step Deck',
    POWER_ONLY: 'Power Only',
    OTHER: 'Other',
  };
  return labels[type] || type;
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/dispatcher/fleet/page.tsx
git commit -m "feat(vehicles): redesign list with status badges, equipment type column, compact fuel display"
```

---

## Task 8: Update VehicleSelector for Route Planning

**Files:**
- Modify: `apps/web/src/app/dispatcher/create-plan/components/VehicleSelector.tsx`

**Step 1: Filter to only AVAILABLE vehicles and show equipment type**

Update the VehicleSelector to only show available vehicles and display equipment type:

In the `vehicles.map(...)` block, wrap it with a filter first:

```tsx
{vehicles && vehicles.length > 0 ? (
  vehicles
    .filter((v) => v.status === 'AVAILABLE' || v.status === undefined)
    .map((vehicle) => {
      const fuelPct = getFuelPercent(
        vehicle.current_fuel_gallons,
        vehicle.fuel_capacity_gallons
      );
      const label = [vehicle.make, vehicle.model]
        .filter(Boolean)
        .join(" ");
      const eqType = vehicle.equipment_type
        ? vehicle.equipment_type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
        : '';
      return (
        <SelectItem
          key={vehicle.vehicle_id}
          value={vehicle.vehicle_id}
        >
          <div className="flex items-center gap-2">
            <span>{vehicle.unit_number}</span>
            {eqType && (
              <span className="text-xs text-muted-foreground">
                {eqType}
              </span>
            )}
            {label && (
              <span className="text-xs text-muted-foreground">
                ({label})
              </span>
            )}
            {fuelPct !== null && (
              <span className="text-xs text-muted-foreground">
                {fuelPct}% fuel
              </span>
            )}
          </div>
        </SelectItem>
      );
    })
) : (
  <div className="p-2 text-sm text-muted-foreground text-center">
    No vehicles available
  </div>
)}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/dispatcher/create-plan/components/VehicleSelector.tsx
git commit -m "feat(vehicles): filter route planning selector to available vehicles, show equipment type"
```

---

## Task 9: Verify and Test

**Step 1: Run TypeScript compilation check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No errors. If there are type errors, fix them.

**Step 2: Run backend compilation check**

```bash
cd apps/backend && npx tsc --noEmit
```

Expected: No errors.

**Step 3: Run existing tests**

```bash
cd apps/backend && npx jest --passWithNoTests
```

Expected: All existing tests pass. The vehicle schema test may need updating if it tests specific field counts.

**Step 4: Manual testing checklist**

Start the app (`pnpm dev` from root) and verify:

- [ ] Navigate to Fleet > Assets > Trucks
- [ ] Click "Add Truck" — verify progressive disclosure form:
  - Essential fields visible: Unit Number, VIN, Equipment Type, Fuel Capacity, MPG, Status
  - "More Details" collapsed by default
  - Click "More Details" — verify Vehicle Info, Registration, Specifications sections appear
- [ ] Create a truck with only essential fields — verify it saves with status AVAILABLE
- [ ] Create a truck with all fields filled — verify everything persists
- [ ] VIN validation: try submitting with <17 chars — should show error
- [ ] Equipment Type: verify dropdown works with all 6 options
- [ ] Status radio: verify Available, In Shop, Out of Service work
- [ ] Edit an existing truck — verify "More Details" auto-expands if optional fields are filled
- [ ] List view: verify new columns (Type, Status badges, combined Fuel/MPG)
- [ ] Status badges: verify color coding (green=Available, amber=In Shop, red=OOS)
- [ ] Route planning: navigate to Create Plan, verify only AVAILABLE vehicles show in selector
- [ ] Dark mode: verify all form elements and badges render correctly
- [ ] Mobile (375px): verify form is single-column, readable, and all fields accessible

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(vehicles): complete vehicle management UX redesign with progressive disclosure"
```
