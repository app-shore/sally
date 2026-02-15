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
