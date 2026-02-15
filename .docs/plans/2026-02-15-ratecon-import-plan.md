# Ratecon Import — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable dispatchers to upload rate confirmation PDFs and automatically extract load data using LLM-powered document parsing, with a review form before creating the load.

**Architecture:** New `ai` top-level domain in NestJS backend with infrastructure layer (Vercel AI SDK + Anthropic) and document-intelligence module (ratecon parser). Frontend adds import dialog to existing loads page with upload zone, review form, and confirmation step.

**Tech Stack:** Vercel AI SDK (`ai` + `@ai-sdk/anthropic`), Zod structured output, NestJS multipart file upload, Shadcn UI dialog/form components.

**Design Doc:** `.docs/plans/2026-02-15-ratecon-import-design.md`

---

## Task 1: Install Backend AI Dependencies

**Files:**
- Modify: `apps/backend/package.json`

**Step 1: Install packages**

```bash
cd apps/backend && pnpm add ai @ai-sdk/anthropic zod
```

Note: `@nestjs/platform-express` and `multer` types are already installed. Zod may already be a transitive dep but we need it as a direct dependency for the schema.

**Step 2: Add ANTHROPIC_API_KEY to environment**

Add to `apps/backend/.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Add to `apps/backend/src/config/configuration.ts` (if env vars are centralized there — check first, only add if config pattern is used):
```typescript
anthropicApiKey: process.env.ANTHROPIC_API_KEY,
```

**Step 3: Commit**

```bash
git add apps/backend/package.json apps/backend/pnpm-lock.yaml
git commit -m "chore: add Vercel AI SDK and Anthropic provider dependencies"
```

---

## Task 2: Create AI Infrastructure Layer

**Files:**
- Create: `apps/backend/src/domains/ai/infrastructure/providers/anthropic.provider.ts`
- Create: `apps/backend/src/domains/ai/infrastructure/ai-infrastructure.module.ts`

**Step 1: Create the Anthropic provider**

Create `apps/backend/src/domains/ai/infrastructure/providers/anthropic.provider.ts`:

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';

/**
 * Shared Anthropic provider instance for all AI features.
 * Uses ANTHROPIC_API_KEY from environment.
 */
export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Default model for structured output / document parsing.
 * Claude Sonnet 4 balances cost, speed, and accuracy for document extraction.
 */
export const DEFAULT_MODEL = anthropic('claude-sonnet-4-20250514');
```

**Step 2: Create the infrastructure module**

Create `apps/backend/src/domains/ai/infrastructure/ai-infrastructure.module.ts`:

```typescript
import { Module, Global } from '@nestjs/common';

/**
 * AI Infrastructure Module
 * Provides shared AI utilities (LLM providers, document processing)
 * to all AI domain submodules.
 */
@Global()
@Module({})
export class AiInfrastructureModule {}
```

Note: The provider is a simple export, not a NestJS injectable. The Vercel AI SDK uses functional patterns — `generateObject()` takes a model directly. No need for DI complexity here.

**Step 3: Commit**

```bash
git add apps/backend/src/domains/ai/
git commit -m "feat: add AI infrastructure layer with Anthropic provider"
```

---

## Task 3: Create Ratecon Parser Schema and Service

**Files:**
- Create: `apps/backend/src/domains/ai/document-intelligence/ratecon/ratecon.schema.ts`
- Create: `apps/backend/src/domains/ai/document-intelligence/ratecon/ratecon-parser.service.ts`

**Step 1: Create the Zod schema**

Create `apps/backend/src/domains/ai/document-intelligence/ratecon/ratecon.schema.ts`:

```typescript
import { z } from 'zod';

/**
 * Zod schema for structured output from rate confirmation PDF parsing.
 * Used with Vercel AI SDK generateObject() for reliable typed extraction.
 *
 * Based on analysis of real ratecon PDFs from:
 * - FLS Transport (Carrier Load & Rate Confirmation)
 * - Armstrong Transport Group (Carrier Rate Confirmation)
 */
export const RateconSchema = z.object({
  // Load identification
  load_number: z.string().describe('The broker/shipper load number or reference ID'),
  po_number: z.string().optional().describe('Purchase order number if present'),
  reference_numbers: z.array(z.string()).optional().describe('Any additional reference numbers'),

  // Broker/customer info
  broker_name: z.string().describe('Name of the broker or shipping company'),
  broker_mc: z.string().optional().describe('Broker MC number'),
  broker_contact_name: z.string().optional().describe('Broker contact person name'),
  broker_contact_email: z.string().optional().describe('Broker contact email'),
  broker_contact_phone: z.string().optional().describe('Broker contact phone number'),

  // Shipment details
  equipment_type: z.string().optional().describe('Required equipment type (e.g., "53\' Dry Van Trailer", "Van", "Reefer")'),
  mode: z.string().optional().describe('Shipping mode (e.g., "Dry Van Truckload", "Full TruckLoad")'),
  commodity: z.string().optional().describe('Type of product being shipped'),
  weight_lbs: z.number().optional().describe('Total weight in pounds'),
  pieces: z.number().optional().describe('Number of pieces, pallets, or packaging units'),

  // Rate
  rate_total_usd: z.number().describe('Total rate amount in USD'),
  rate_details: z.array(z.object({
    type: z.string().describe('Rate line item type (e.g., "LineHaul", "Fuel Surcharge")'),
    amount_usd: z.number().describe('Amount in USD for this line item'),
  })).optional().describe('Breakdown of rate line items'),

  // Stops (ordered by sequence)
  stops: z.array(z.object({
    sequence: z.number().describe('Stop order (1-based)'),
    action_type: z.enum(['pickup', 'delivery']).describe('Whether this is a pickup or delivery stop'),
    facility_name: z.string().describe('Name of the facility or location'),
    address: z.string().describe('Street address'),
    city: z.string().describe('City'),
    state: z.string().describe('State abbreviation (e.g., "NJ", "MA")'),
    zip_code: z.string().describe('ZIP code'),
    appointment_date: z.string().optional().describe('Appointment date in YYYY-MM-DD format'),
    appointment_time: z.string().optional().describe('Appointment time in HH:MM format (24h)'),
    contact_name: z.string().optional().describe('Contact person at facility'),
    contact_phone: z.string().optional().describe('Contact phone number'),
    facility_hours: z.string().optional().describe('Facility operating hours'),
    pickup_number: z.string().optional().describe('Pickup or delivery number'),
    reference: z.string().optional().describe('Stop-level reference number'),
  })).describe('Ordered list of stops, pickups first then deliveries'),

  // Special instructions (summarized)
  special_instructions: z.string().optional().describe('Key special instructions, summarized concisely. Omit standard legal boilerplate.'),
});

export type RateconData = z.infer<typeof RateconSchema>;
```

**Step 2: Create the parser service**

Create `apps/backend/src/domains/ai/document-intelligence/ratecon/ratecon-parser.service.ts`:

```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { generateObject } from 'ai';
import { DEFAULT_MODEL } from '../../infrastructure/providers/anthropic.provider';
import { RateconSchema, RateconData } from './ratecon.schema';

@Injectable()
export class RateconParserService {
  private readonly logger = new Logger(RateconParserService.name);

  /**
   * Parse a rate confirmation PDF using Claude's vision capabilities.
   * Sends the PDF as a base64-encoded document and extracts structured data
   * using Vercel AI SDK's generateObject() with a Zod schema.
   *
   * @param fileBuffer - The PDF file as a Buffer
   * @param fileName - Original filename for logging
   * @returns Parsed ratecon data matching RateconSchema
   */
  async parse(fileBuffer: Buffer, fileName: string): Promise<RateconData> {
    this.logger.log(`Parsing ratecon PDF: ${fileName} (${fileBuffer.length} bytes)`);

    try {
      const result = await generateObject({
        model: DEFAULT_MODEL,
        schema: RateconSchema,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all load information from this rate confirmation document.

Rules:
- Extract every field you can find. Leave optional fields empty if not present.
- For stops, determine if each is a pickup or delivery based on context (sequence, labels like "Pickup#", "Delivery#").
- Convert dates to YYYY-MM-DD format and times to HH:MM 24-hour format.
- For state, use 2-letter abbreviation (e.g., "NJ" not "New Jersey").
- For special_instructions, summarize the key operational requirements (tracking, detention policy, PPE requirements). Omit standard legal boilerplate and payment terms.
- For rate, extract the total amount in USD as a number (e.g., 1000.00 not "$1,000.00").
- For weight, extract in pounds as a number.`,
              },
              {
                type: 'file',
                data: fileBuffer,
                mimeType: 'application/pdf',
              },
            ],
          },
        ],
      });

      this.logger.log(`Successfully parsed ratecon: ${fileName} — load_number: ${result.object.load_number}`);
      return result.object;
    } catch (error) {
      this.logger.error(`Failed to parse ratecon: ${fileName}`, error);
      throw new BadRequestException(
        `Failed to parse rate confirmation PDF. Please ensure the file is a valid rate confirmation document.`,
      );
    }
  }
}
```

**Step 3: Commit**

```bash
git add apps/backend/src/domains/ai/document-intelligence/ratecon/
git commit -m "feat: add ratecon parser service with Zod schema and Claude structured output"
```

---

## Task 4: Create Ratecon Controller and Wire Up Modules

**Files:**
- Create: `apps/backend/src/domains/ai/document-intelligence/ratecon/ratecon.controller.ts`
- Create: `apps/backend/src/domains/ai/document-intelligence/document-intelligence.module.ts`
- Create: `apps/backend/src/domains/ai/ai.module.ts`
- Modify: `apps/backend/src/app.module.ts`

**Step 1: Create the controller**

Create `apps/backend/src/domains/ai/document-intelligence/ratecon/ratecon.controller.ts`:

```typescript
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Roles } from '../../../../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { RateconParserService } from './ratecon-parser.service';

@ApiTags('AI - Document Intelligence')
@ApiBearerAuth()
@Controller('ai/documents')
export class RateconController {
  constructor(private readonly rateconParser: RateconParserService) {}

  @Post('parse-ratecon')
  @Roles(UserRole.DISPATCHER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Parse a rate confirmation PDF and extract load data' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async parseRatecon(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are accepted');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    const data = await this.rateconParser.parse(file.buffer, file.originalname);
    return { success: true, data };
  }
}
```

**Step 2: Create the document intelligence module**

Create `apps/backend/src/domains/ai/document-intelligence/document-intelligence.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { RateconController } from './ratecon/ratecon.controller';
import { RateconParserService } from './ratecon/ratecon-parser.service';

/**
 * Document Intelligence Module
 * Handles AI-powered document parsing for various freight document types.
 * Currently supports: Rate Confirmations (PDFs)
 * Future: BOL, POD, Invoice parsing
 */
@Module({
  controllers: [RateconController],
  providers: [RateconParserService],
  exports: [RateconParserService],
})
export class DocumentIntelligenceModule {}
```

**Step 3: Create the AI aggregate module**

Create `apps/backend/src/domains/ai/ai.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AiInfrastructureModule } from './infrastructure/ai-infrastructure.module';
import { DocumentIntelligenceModule } from './document-intelligence/document-intelligence.module';

/**
 * AI Domain Module — aggregates all AI-related functionality.
 *
 * Submodules:
 * - Infrastructure: Shared LLM providers (Anthropic, future OpenAI)
 * - Document Intelligence: PDF parsing (ratecon, future BOL/POD)
 * - Sally AI: Conversational agent (future — currently in platform/)
 */
@Module({
  imports: [AiInfrastructureModule, DocumentIntelligenceModule],
  exports: [DocumentIntelligenceModule],
})
export class AiModule {}
```

**Step 4: Register AI module in AppModule**

Modify `apps/backend/src/app.module.ts` — add import:

```typescript
import { AiModule } from './domains/ai/ai.module';
```

Add `AiModule` to the `imports` array after the existing domain modules:

```typescript
imports: [
  // ... existing imports ...
  FleetModule,
  PlatformModule,
  IntegrationsModule,
  OperationsModule,
  RoutingModule,
  FinancialsModule,
  AiModule,  // ← Add here
],
```

**Step 5: Commit**

```bash
git add apps/backend/src/domains/ai/ apps/backend/src/app.module.ts
git commit -m "feat: wire up AI domain with ratecon controller and document intelligence module"
```

---

## Task 5: Test Backend Endpoint Manually

**Step 1: Start the backend**

```bash
cd apps/backend && pnpm run start:dev
```

**Step 2: Test with curl using a sample ratecon PDF**

```bash
curl -X POST http://localhost:8000/ai/documents/parse-ratecon \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@.docs/research/ratecon/005617664 - JY CARRIERS LLC - JYCAHAMA00 - Carrier Rate and Load Confirmation.pdf" \
  | jq .
```

**Step 3: Verify response matches schema**

Expected response shape:
```json
{
  "success": true,
  "data": {
    "load_number": "005617664",
    "broker_name": "FLS Transportation Services Limited",
    "rate_total_usd": 1000.00,
    "stops": [
      { "sequence": 1, "action_type": "pickup", "city": "Monroe", "state": "NJ" },
      { "sequence": 2, "action_type": "delivery", "city": "Uxbridge", "state": "MA" }
    ]
  }
}
```

**Step 4: Test with the second sample**

```bash
curl -X POST http://localhost:8000/ai/documents/parse-ratecon \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@.docs/research/ratecon/t0cxtg8713eby1dvojmhohnpaa5t.pdf" \
  | jq .
```

**Step 5: Test error cases**

```bash
# No file
curl -X POST http://localhost:8000/ai/documents/parse-ratecon \
  -H "Authorization: Bearer <JWT_TOKEN>" | jq .
# Expected: 400 "No file provided"

# Wrong file type (create a dummy txt file)
echo "test" > /tmp/test.txt
curl -X POST http://localhost:8000/ai/documents/parse-ratecon \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "file=@/tmp/test.txt;type=text/plain" | jq .
# Expected: 400 "Only PDF files are accepted"
```

**Step 6: Commit any fixes needed**

---

## Task 6: Add Ratecon API Client and Types to Frontend

**Files:**
- Create: `apps/web/src/features/fleet/loads/types/ratecon.ts`
- Modify: `apps/web/src/features/fleet/loads/api.ts`

**Step 1: Create ratecon types**

Create `apps/web/src/features/fleet/loads/types/ratecon.ts`:

```typescript
/** Extracted data from a parsed rate confirmation PDF */
export interface RateconData {
  load_number: string;
  po_number?: string;
  reference_numbers?: string[];

  broker_name: string;
  broker_mc?: string;
  broker_contact_name?: string;
  broker_contact_email?: string;
  broker_contact_phone?: string;

  equipment_type?: string;
  mode?: string;
  commodity?: string;
  weight_lbs?: number;
  pieces?: number;

  rate_total_usd: number;
  rate_details?: Array<{
    type: string;
    amount_usd: number;
  }>;

  stops: Array<{
    sequence: number;
    action_type: 'pickup' | 'delivery';
    facility_name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    appointment_date?: string;
    appointment_time?: string;
    contact_name?: string;
    contact_phone?: string;
    facility_hours?: string;
    pickup_number?: string;
    reference?: string;
  }>;

  special_instructions?: string;
}

/** Response from the parse-ratecon endpoint */
export interface ParseRateconResponse {
  success: boolean;
  data: RateconData;
}
```

**Step 2: Add parseRatecon to loads API**

Add to `apps/web/src/features/fleet/loads/api.ts`:

```typescript
import type { ParseRateconResponse } from './types/ratecon';

// Add to the loadsApi object:
  parseRatecon: async (file: File): Promise<ParseRateconResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const token = useAuthStore.getState().token;

    const response = await fetch(`${baseUrl}/ai/documents/parse-ratecon`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to parse file' }));
      throw new Error(error.detail || error.message || 'Failed to parse rate confirmation');
    }

    return response.json();
  },
```

Note: We use raw `fetch` here instead of `apiClient` because `apiClient` sets `Content-Type: application/json` and stringifies the body. For multipart form data, we need the browser to set the Content-Type with boundary automatically.

**Step 3: Re-export the ratecon type from the barrel**

Check `apps/web/src/features/fleet/loads/index.ts` and add:

```typescript
export type { RateconData, ParseRateconResponse } from './types/ratecon';
```

Also update `apps/web/src/features/fleet/loads/types.ts` (or its barrel) to re-export:

```typescript
export * from './types/ratecon';
```

Note: Check the actual barrel/types structure first. If `types.ts` is a flat file (not a directory), create `types/ratecon.ts` alongside it and import from the new path directly in the API file.

**Step 4: Commit**

```bash
git add apps/web/src/features/fleet/loads/
git commit -m "feat: add ratecon parsing API client and types"
```

---

## Task 7: Create Upload Zone Component

**Files:**
- Create: `apps/web/src/features/fleet/loads/components/ratecon-upload-zone.tsx`

**Step 1: Create the drag-and-drop upload zone**

Create `apps/web/src/features/fleet/loads/components/ratecon-upload-zone.tsx`:

```tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

interface RateconUploadZoneProps {
  onFileSelected: (file: File) => void;
  isUploading: boolean;
  error: string | null;
}

export function RateconUploadZone({ onFileSelected, isUploading, error }: RateconUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      if (file.type !== 'application/pdf') {
        return; // Silently ignore non-PDF files
      }
      if (file.size > 10 * 1024 * 1024) {
        return; // 10MB limit
      }
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
    },
    [validateAndSelect],
  );

  if (isUploading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Parsing rate confirmation...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Extracting load details with AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center py-10 px-4
          border-2 border-dashed rounded-lg cursor-pointer
          transition-colors
          ${isDragOver
            ? 'border-foreground bg-accent/50'
            : 'border-border hover:border-foreground/50 hover:bg-accent/30'
          }
        `}
      >
        <div className="flex flex-col items-center space-y-2">
          {isDragOver ? (
            <FileText className="h-8 w-8 text-foreground" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isDragOver ? 'Drop your rate confirmation' : 'Upload rate confirmation'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Drag and drop a PDF file, or click to browse
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/fleet/loads/components/ratecon-upload-zone.tsx
git commit -m "feat: add ratecon upload zone component with drag-and-drop"
```

---

## Task 8: Create Review Form Component

**Files:**
- Create: `apps/web/src/features/fleet/loads/components/ratecon-review-form.tsx`

**Step 1: Create the review form**

This form mirrors the existing New Load form layout but is pre-filled with AI-extracted data. The user reviews and edits before confirming.

Create `apps/web/src/features/fleet/loads/components/ratecon-review-form.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/shared/components/ui/collapsible';
import { loadsApi } from '../api';
import { customersApi } from '@/features/fleet/customers/api';
import type { RateconData } from '../types/ratecon';
import type { LoadCreate, LoadStopCreate } from '../types';
import type { Customer } from '@/features/fleet/customers/types';

interface RateconReviewFormProps {
  data: RateconData;
  fileName: string;
  onSuccess: () => void;
  onCancel: () => void;
  onBack: () => void;
}

export function RateconReviewForm({ data, fileName, onSuccess, onCancel, onBack }: RateconReviewFormProps) {
  // Map ratecon data to form state
  const [customerName, setCustomerName] = useState(data.broker_name);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [referenceNumber, setReferenceNumber] = useState(data.load_number || '');
  const [equipmentType, setEquipmentType] = useState(data.equipment_type || '');
  const [weightLbs, setWeightLbs] = useState(String(data.weight_lbs || ''));
  const [rateDollars, setRateDollars] = useState(String(data.rate_total_usd || ''));
  const [commodityType, setCommodityType] = useState(data.commodity || '');
  const [pieces, setPieces] = useState(String(data.pieces || ''));
  const [specialRequirements, setSpecialRequirements] = useState(data.special_instructions || '');

  const [stops, setStops] = useState<Array<{
    name: string;
    action_type: 'pickup' | 'delivery' | 'both';
    address: string;
    city: string;
    state: string;
    zip_code: string;
    earliest_arrival: string;
    estimated_dock_hours: number;
  }>>(
    data.stops.map((s) => ({
      name: s.facility_name,
      action_type: s.action_type,
      address: s.address,
      city: s.city,
      state: s.state,
      zip_code: s.zip_code,
      earliest_arrival: s.appointment_date && s.appointment_time
        ? `${s.appointment_date}T${s.appointment_time}`
        : s.appointment_date || '',
      estimated_dock_hours: 2,
    })),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load customers for matching
  useEffect(() => {
    customersApi.list().then(setCustomers).catch(() => {});
  }, []);

  // Try to auto-match customer by broker name
  useEffect(() => {
    if (customers.length > 0 && data.broker_name) {
      const match = customers.find(
        (c) => c.company_name.toLowerCase().includes(data.broker_name.toLowerCase())
          || data.broker_name.toLowerCase().includes(c.company_name.toLowerCase()),
      );
      if (match) {
        setSelectedCustomerId(String(match.id));
        setCustomerName(match.company_name);
      }
    }
  }, [customers, data.broker_name]);

  const handleCustomerChange = (value: string) => {
    setSelectedCustomerId(value);
    if (value && value !== 'new') {
      const customer = customers.find((c) => String(c.id) === value);
      if (customer) setCustomerName(customer.company_name);
    }
  };

  const updateStop = (index: number, field: string, value: any) => {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addStop = () => {
    setStops((prev) => [
      ...prev,
      { name: '', action_type: 'delivery' as const, address: '', city: '', state: '', zip_code: '', earliest_arrival: '', estimated_dock_hours: 2 },
    ]);
  };

  const removeStop = (index: number) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      if (!customerName.trim()) {
        setFormError('Customer name is required');
        setIsSubmitting(false);
        return;
      }
      if (!weightLbs || Number(weightLbs) <= 0) {
        setFormError('Weight is required');
        setIsSubmitting(false);
        return;
      }
      if (stops.length < 2) {
        setFormError('At least 2 stops are required');
        setIsSubmitting(false);
        return;
      }

      const loadStops: LoadStopCreate[] = stops.map((s, i) => ({
        stop_id: `STOP-IMPORT-${Date.now()}-${i}`,
        sequence_order: i + 1,
        action_type: s.action_type,
        earliest_arrival: s.earliest_arrival || undefined,
        estimated_dock_hours: s.estimated_dock_hours,
        name: s.name,
        address: s.address,
        city: s.city,
        state: s.state,
        zip_code: s.zip_code,
      }));

      const loadData: LoadCreate = {
        weight_lbs: Number(weightLbs),
        commodity_type: commodityType || 'General Freight',
        equipment_type: equipmentType || undefined,
        special_requirements: specialRequirements || undefined,
        customer_name: customerName,
        customer_id: selectedCustomerId ? Number(selectedCustomerId) : undefined,
        reference_number: referenceNumber || undefined,
        rate_cents: rateDollars ? Math.round(Number(rateDollars) * 100) : undefined,
        pieces: pieces ? Number(pieces) : undefined,
        intake_source: 'import',
        intake_metadata: {
          source_file: fileName,
          parsed_at: new Date().toISOString(),
          broker_name: data.broker_name,
          broker_mc: data.broker_mc,
          original_load_number: data.load_number,
        },
        stops: loadStops,
      };

      await loadsApi.create(loadData);
      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create load');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* AI badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          Extracted from rate con
        </Badge>
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{fileName}</span>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Core fields */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Customer */}
          <div>
            <Label className="text-xs text-muted-foreground">Customer *</Label>
            {customers.length > 0 ? (
              <Select value={selectedCustomerId} onValueChange={handleCustomerChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={customerName || 'Select customer...'} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">+ New Customer ({customerName})</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input className="h-9" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            )}
          </div>

          {/* Reference (broker load number) */}
          <div>
            <Label className="text-xs text-muted-foreground">Reference / PO #</Label>
            <Input className="h-9" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Equipment */}
          <div>
            <Label className="text-xs text-muted-foreground">Equipment</Label>
            <Input className="h-9" value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)} placeholder="e.g., Dry Van" />
          </div>

          {/* Weight */}
          <div>
            <Label className="text-xs text-muted-foreground">Weight (lbs) *</Label>
            <Input className="h-9" type="number" value={weightLbs} onChange={(e) => setWeightLbs(e.target.value)} />
          </div>

          {/* Rate */}
          <div>
            <Label className="text-xs text-muted-foreground">Rate ($)</Label>
            <Input className="h-9" type="number" step="0.01" value={rateDollars} onChange={(e) => setRateDollars(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-border" />

      {/* Stops */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Route ({stops.length} stops)
          </h4>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addStop}>
            <Plus className="h-3 w-3 mr-1" />
            Add Stop
          </Button>
        </div>

        <div className="space-y-2">
          {stops.map((stop, index) => (
            <div key={index} className="border border-border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {index + 1}. {stop.action_type}
                  </Badge>
                  {stop.name && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{stop.name}</span>
                  )}
                </div>
                {stops.length > 2 && (
                  <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeStop(index)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Facility Name</Label>
                  <Input className="h-8 text-sm" value={stop.name} onChange={(e) => updateStop(index, 'name', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={stop.action_type} onValueChange={(v) => updateStop(index, 'action_type', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Address</Label>
                <Input className="h-8 text-sm" value={stop.address} onChange={(e) => updateStop(index, 'address', e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <Input className="h-8 text-sm" value={stop.city} onChange={(e) => updateStop(index, 'city', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">State</Label>
                  <Input className="h-8 text-sm" value={stop.state} onChange={(e) => updateStop(index, 'state', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">ZIP</Label>
                  <Input className="h-8 text-sm" value={stop.zip_code} onChange={(e) => updateStop(index, 'zip_code', e.target.value)} />
                </div>
              </div>

              {stop.earliest_arrival && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Appointment</Label>
                    <Input className="h-8 text-sm" type="datetime-local" value={stop.earliest_arrival} onChange={(e) => updateStop(index, 'earliest_arrival', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Est. Dock Hours</Label>
                    <Input className="h-8 text-sm" type="number" step="0.5" value={stop.estimated_dock_hours} onChange={(e) => updateStop(index, 'estimated_dock_hours', Number(e.target.value))} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* More details (collapsible) */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-3.5 w-3.5 transition-transform data-[state=open]:rotate-90" />
          More Details
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Commodity</Label>
              <Input className="h-9" value={commodityType} onChange={(e) => setCommodityType(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Pieces</Label>
              <Input className="h-9" type="number" value={pieces} onChange={(e) => setPieces(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Special Requirements</Label>
            <textarea
              className="w-full h-20 text-sm rounded-md border border-input bg-background px-3 py-2 text-foreground resize-none"
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Actions */}
      <div className="flex justify-between pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          Upload Different File
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Load'}
          </Button>
        </div>
      </div>
    </form>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/fleet/loads/components/ratecon-review-form.tsx
git commit -m "feat: add ratecon review form component with pre-filled AI-extracted data"
```

---

## Task 9: Create Import Dialog and Wire to Loads Page

**Files:**
- Create: `apps/web/src/features/fleet/loads/components/import-ratecon-dialog.tsx`
- Modify: `apps/web/src/app/dispatcher/loads/page.tsx`

**Step 1: Create the import dialog**

Create `apps/web/src/features/fleet/loads/components/import-ratecon-dialog.tsx`:

```tsx
'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { loadsApi } from '../api';
import type { RateconData } from '../types/ratecon';
import { RateconUploadZone } from './ratecon-upload-zone';
import { RateconReviewForm } from './ratecon-review-form';

interface ImportRateconDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'review';

export function ImportRateconDialog({ open, onOpenChange, onSuccess }: ImportRateconDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<RateconData | null>(null);
  const [fileName, setFileName] = useState('');

  const reset = useCallback(() => {
    setStep('upload');
    setIsUploading(false);
    setUploadError(null);
    setParsedData(null);
    setFileName('');
  }, []);

  const handleFileSelected = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setFileName(file.name);

    try {
      const result = await loadsApi.parseRatecon(file);
      setParsedData(result.data);
      setStep('review');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse rate confirmation');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSuccess = useCallback(() => {
    reset();
    onOpenChange(false);
    onSuccess();
  }, [reset, onOpenChange, onSuccess]);

  const handleCancel = useCallback(() => {
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  }, [reset, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' ? 'Import Rate Confirmation' : 'Review Extracted Load'}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <RateconUploadZone
            onFileSelected={handleFileSelected}
            isUploading={isUploading}
            error={uploadError}
          />
        )}

        {step === 'review' && parsedData && (
          <RateconReviewForm
            data={parsedData}
            fileName={fileName}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            onBack={reset}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Wire into the loads page**

Modify `apps/web/src/app/dispatcher/loads/page.tsx`:

Add import at the top with other feature imports:
```typescript
import { ImportRateconDialog } from '@/features/fleet/loads/components/import-ratecon-dialog';
```

Add state variable near the other dialog states (near `isNewLoadOpen`):
```typescript
const [isRateconImportOpen, setIsRateconImportOpen] = useState(false);
```

Replace the Import dropdown content. Find this section:
```tsx
<DropdownMenuContent align="end">
  <DropdownMenuItem disabled>CSV/Excel Import (Phase 2)</DropdownMenuItem>
  <DropdownMenuItem disabled>Email-to-Load (Phase 2)</DropdownMenuItem>
  <DropdownMenuItem disabled>DAT Search (Phase 2)</DropdownMenuItem>
</DropdownMenuContent>
```

Replace with:
```tsx
<DropdownMenuContent align="end">
  <DropdownMenuItem onClick={() => setIsRateconImportOpen(true)}>
    Rate Confirmation (PDF)
  </DropdownMenuItem>
  <DropdownMenuItem disabled>Email-to-Load (Phase 2)</DropdownMenuItem>
  <DropdownMenuItem disabled>DAT Search (Phase 2)</DropdownMenuItem>
</DropdownMenuContent>
```

Add the dialog component at the end of the JSX (before the closing `</div>` of the page, near the other dialogs like the New Load dialog and the detail Sheet):
```tsx
<ImportRateconDialog
  open={isRateconImportOpen}
  onOpenChange={setIsRateconImportOpen}
  onSuccess={() => fetchLoads()}
/>
```

Note: `fetchLoads` should already exist as the function that refreshes the loads list. Check the actual function name — it might be `refetch` from React Query or a custom fetch function.

**Step 3: Commit**

```bash
git add apps/web/src/features/fleet/loads/components/import-ratecon-dialog.tsx apps/web/src/app/dispatcher/loads/page.tsx
git commit -m "feat: add ratecon import dialog and enable import button on loads page"
```

---

## Task 10: End-to-End Testing

**Step 1: Start both backend and frontend**

```bash
# Terminal 1
cd apps/backend && pnpm run start:dev

# Terminal 2
cd apps/web && pnpm run dev
```

**Step 2: Test the full flow**

1. Navigate to `/dispatcher/loads` page
2. Click "Import" dropdown → "Rate Confirmation (PDF)"
3. Upload the FLS Transport sample: `.docs/research/ratecon/005617664 - JY CARRIERS LLC - JYCAHAMA00 - Carrier Rate and Load Confirmation.pdf`
4. Verify:
   - Loading state shows "Parsing rate confirmation..."
   - Review form populates with extracted data
   - Customer: "FLS Transportation Services Limited"
   - Reference: "005617664"
   - Weight: 24104
   - Rate: 1000.00
   - 2 stops: Monroe, NJ (pickup) → Uxbridge, MA (delivery)
5. Click "Create Load"
6. Verify load appears in the Kanban board

**Step 3: Test with Armstrong ratecon**

Repeat with `.docs/research/ratecon/t0cxtg8713eby1dvojmhohnpaa5t.pdf`. Expected:
- Customer: "Armstrong Transport Group"
- Rate: 1200.00
- 2 stops: North Reading, MA (pickup) → Brooklyn, NY (delivery)

**Step 4: Test error cases**

- Upload a non-PDF file (should be rejected by file picker)
- Upload with backend down (should show error, allow retry)
- Edit extracted fields before confirming
- Click "Upload Different File" to go back
- Cancel at any step

**Step 5: Visual checks**

- Toggle dark mode — verify all colors work
- Test at 375px width (mobile) — verify responsive layout
- Test at 768px (tablet) and 1440px (desktop)

**Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues from end-to-end ratecon import testing"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Install deps | `apps/backend/package.json` |
| 2 | AI infrastructure layer | `domains/ai/infrastructure/` |
| 3 | Ratecon schema + parser service | `domains/ai/document-intelligence/ratecon/` |
| 4 | Controller + module wiring | `ratecon.controller.ts`, `ai.module.ts`, `app.module.ts` |
| 5 | Manual backend test | curl commands |
| 6 | Frontend API client + types | `api.ts`, `types/ratecon.ts` |
| 7 | Upload zone component | `ratecon-upload-zone.tsx` |
| 8 | Review form component | `ratecon-review-form.tsx` |
| 9 | Import dialog + page wiring | `import-ratecon-dialog.tsx`, `page.tsx` |
| 10 | End-to-end testing | Manual testing |
