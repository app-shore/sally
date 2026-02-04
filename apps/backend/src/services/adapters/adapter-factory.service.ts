import { Injectable } from '@nestjs/common';
import { ITMSAdapter } from './tms/tms-adapter.interface';
import { IELDAdapter } from './eld/eld-adapter.interface';
import { Project44TMSAdapter } from './tms/project44-tms.adapter';
import { McLeodTMSAdapter } from './tms/mcleod-tms.adapter';
import { SamsaraELDAdapter } from './eld/samsara-eld.adapter';

/**
 * Adapter Factory Service
 *
 * Central registry that maps vendor IDs to adapter instances.
 * This is the ONLY place where vendor-to-adapter mapping happens.
 *
 * When adding a new vendor:
 * 1. Create the adapter class implementing ITMSAdapter or IELDAdapter
 * 2. Add it to the constructor
 * 3. Add mapping in getTMSAdapter() or getELDAdapter()
 * 4. Add to SyncModule providers
 */
@Injectable()
export class AdapterFactoryService {
  constructor(
    // TMS Adapters
    private project44Adapter: Project44TMSAdapter,
    private mcleodAdapter: McLeodTMSAdapter,

    // ELD Adapters
    private samsaraELDAdapter: SamsaraELDAdapter,
  ) {}

  /**
   * Get TMS adapter for a vendor
   * @param vendor - Vendor ID from vendor registry (e.g., 'PROJECT44_TMS')
   * @returns TMS adapter instance or null if not supported
   */
  getTMSAdapter(vendor: string): ITMSAdapter | null {
    const adapterMap: Record<string, ITMSAdapter> = {
      PROJECT44_TMS: this.project44Adapter,
      MCLEOD_TMS: this.mcleodAdapter,
      TMW_TMS: this.mcleodAdapter, // TMW uses similar API to McLeod
    };

    return adapterMap[vendor] || null;
  }

  /**
   * Get ELD adapter for a vendor
   * @param vendor - Vendor ID from vendor registry (e.g., 'SAMSARA_ELD')
   * @returns ELD adapter instance or null if not supported
   */
  getELDAdapter(vendor: string): IELDAdapter | null {
    const adapterMap: Record<string, IELDAdapter> = {
      SAMSARA_ELD: this.samsaraELDAdapter,
      KEEPTRUCKIN_ELD: this.samsaraELDAdapter, // KeepTruckin API is similar to Samsara
      MOTIVE_ELD: this.samsaraELDAdapter, // Motive (formerly KeepTruckin) uses similar API
    };

    return adapterMap[vendor] || null;
  }

  /**
   * Check if a TMS vendor is supported
   */
  isTMSVendorSupported(vendor: string): boolean {
    return this.getTMSAdapter(vendor) !== null;
  }

  /**
   * Check if an ELD vendor is supported
   */
  isELDVendorSupported(vendor: string): boolean {
    return this.getELDAdapter(vendor) !== null;
  }
}
