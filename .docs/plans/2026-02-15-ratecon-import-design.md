# Ratecon Import Feature — Design Document

**Date:** 2026-02-15
**Status:** Approved
**Author:** AI-assisted design session

---

## Overview

Enable dispatchers to upload rate confirmation PDFs and automatically extract load data using LLM-powered document parsing. The extracted data is presented in a review form where the dispatcher can verify and edit before creating the load.

## Architecture

### AI Domain (New Top-Level Domain)

```
apps/backend/src/domains/ai/
├── ai.module.ts
├── infrastructure/
│   ├── ai-infrastructure.module.ts
│   ├── providers/
│   │   └── anthropic.provider.ts      # Vercel AI SDK + @ai-sdk/anthropic
│   └── document/
│       └── pdf-processor.service.ts   # PDF buffer handling for Claude vision
│
├── document-intelligence/
│   ├── document-intelligence.module.ts
│   ├── ratecon/
│   │   ├── ratecon.controller.ts      # POST /api/v1/ai/documents/parse-ratecon
│   │   ├── ratecon-parser.service.ts  # Claude structured output with Zod schema
│   │   └── ratecon.schema.ts          # Zod schema for extracted ratecon data
│   └── (future: bol/, pod/, invoice/)
│
└── sally-ai/                          # Moved from platform/ (future phase)
    └── ...existing files...
```

### Design Decisions

1. **AI is a first-class domain** — not buried under "platform" alongside tenants and billing
2. **Shared infrastructure** — provider configs and PDF processing reused by document parsing AND conversational AI
3. **Clean separation** — document-intelligence doesn't know about sally-ai; they share infrastructure
4. **Future-proof** — adding RAG, route intelligence, or new document types is just adding a subdirectory
5. **Single deployment** — everything stays in apps/backend, shared auth/database

### LLM Choice

**Claude (Anthropic) via `@ai-sdk/anthropic` and Vercel AI SDK**
- Native PDF/image understanding — processes PDF directly without separate OCR
- Structured output with Zod schemas gives reliable, typed JSON
- High accuracy on semi-structured documents like rate confirmations
- Vercel AI SDK makes switching providers trivial if needed

---

## Ratecon Zod Schema

Based on analysis of real rate confirmation PDFs from FLS Transport and Armstrong Transport Group:

```typescript
const RateconSchema = z.object({
  // Load identification
  load_number: z.string(),
  po_number: z.string().optional(),
  reference_numbers: z.array(z.string()).optional(),

  // Broker/customer info
  broker_name: z.string(),
  broker_mc: z.string().optional(),
  broker_contact_name: z.string().optional(),
  broker_contact_email: z.string().optional(),
  broker_contact_phone: z.string().optional(),

  // Shipment details
  equipment_type: z.string().optional(),
  mode: z.string().optional(),
  commodity: z.string().optional(),
  weight_lbs: z.number().optional(),
  pieces: z.number().optional(),

  // Rate
  rate_total_usd: z.number(),
  rate_details: z.array(z.object({
    type: z.string(),
    amount_usd: z.number(),
  })).optional(),

  // Stops (ordered)
  stops: z.array(z.object({
    sequence: z.number(),
    action_type: z.enum(["pickup", "delivery"]),
    facility_name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zip_code: z.string(),
    appointment_date: z.string().optional(),
    appointment_time: z.string().optional(),
    contact_name: z.string().optional(),
    contact_phone: z.string().optional(),
    facility_hours: z.string().optional(),
    pickup_number: z.string().optional(),
    reference: z.string().optional(),
  })),

  // Special instructions (summarized from wall of text)
  special_instructions: z.string().optional(),
})
```

---

## API Design

### Endpoint

```
POST /api/v1/ai/documents/parse-ratecon
Content-Type: multipart/form-data
Auth: Required (DISPATCHER, ADMIN, OWNER)

Body: { file: PDF file }

Response: {
  success: true,
  data: RateconData  // Matches Zod schema above
}
```

### Flow

```
Frontend uploads PDF
  → POST /api/v1/ai/documents/parse-ratecon (multipart/form-data)
  → Backend reads file buffer
  → Converts to base64 for Claude vision API
  → Calls Claude via Vercel AI SDK generateObject() with Zod schema
  → Returns typed RateconData JSON
  → Frontend shows review form pre-filled with extracted data
  → User confirms → POST /loads/ (existing endpoint, intake_source: "import")
```

---

## Frontend UX

### Entry Point

The Import dropdown on the loads page header:

```
[Import ▾]
├── Rate Confirmation (PDF)    ← Enabled
├── Email-to-Load (Phase 2)   ← Disabled
└── DAT Search (Phase 2)      ← Disabled
```

### Dialog Flow (Tier 2: max-w-2xl)

**Step 1: Upload**
- Drag-and-drop zone + file picker button
- Accepts: `.pdf` files only, single file
- File size limit: 10MB
- On drop/select: immediately uploads and parses, shows loading state

**Step 2: Review & Edit**
- Pre-filled form matching existing New Load form layout
- All fields editable — AI extraction is a suggestion, not final
- Small badge: "Extracted from rate con"
- 2-column grid layout, same compact stop rows as New Load form
- Empty/uncertain fields highlighted subtly

**Step 3: Confirm**
- "Create Load" button
- Calls existing `POST /loads/` with `intake_source: "import"`
- `intake_metadata`: `{ source_file: "filename.pdf", parsed_at: "...", broker_name: "..." }`
- On success: close dialog, refresh list, show toast

### Component Structure

```
apps/web/src/features/fleet/loads/components/
├── import-ratecon-dialog.tsx     # Dialog with upload + review steps
├── ratecon-upload-zone.tsx       # Drag-and-drop file upload area
└── ratecon-review-form.tsx       # Pre-filled review/edit form
```

### Error Handling
- Parse failure: show error with retry or "enter manually" option
- Network error: standard error toast
- Invalid file type: immediate validation before upload

---

## Dependencies (New Packages)

### Backend (apps/backend)
- `ai` — Vercel AI SDK core
- `@ai-sdk/anthropic` — Anthropic provider for Claude
- `zod` — Already in project, used for structured output schema
- `@nestjs/platform-express` — Already installed, used for multipart file upload

### Frontend (apps/web)
- No new dependencies — uses existing Shadcn UI components and API client patterns

---

## Data Mapping: Ratecon → Load

| Ratecon Field | Load Field | Notes |
|---------------|------------|-------|
| broker_name | customer_name | Broker is the "customer" for the carrier |
| rate_total_usd | rate_cents | Convert: USD * 100 |
| weight_lbs | weight_lbs | Direct |
| commodity | commodity_type | Direct |
| equipment_type | equipment_type | Normalize to system values |
| pieces | pieces | Direct |
| load_number | reference_number | Broker's load number stored as reference |
| special_instructions | special_requirements | Direct |
| stops[].* | stops[].* | Map to LoadStopCreate format |

---

## Future Extensions

- **Email-to-Load**: Forward ratecon emails, extract PDF attachment, auto-parse
- **BOL parsing**: Different schema, same infrastructure
- **Batch import**: Upload multiple ratecons at once
- **Sally-AI integration**: "Parse this ratecon" as a conversational command
- **Confidence scoring**: Show confidence per field to guide dispatcher review
