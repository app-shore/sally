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
