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
                mediaType: 'application/pdf',
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
