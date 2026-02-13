export interface ReferenceItem {
  code: string;
  label: string;
  sort_order: number;
  metadata: Record<string, any>;
}

export type ReferenceDataMap = Record<string, ReferenceItem[]>;
