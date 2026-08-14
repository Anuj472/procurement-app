// Represents a single SHIS record for an item
export interface ShisRecord {
  shis_no: string;
  shis_dt: string;
}

// Represents an item that has been processed and linked to a vendor
export interface ClubbedItem {
  lf_no: string;
  item_description: string;
  last_rate_wo_tax: number | null;
  shis_records: ShisRecord[]; // Array of SHIS records ordered by date
}

// The final grouped payload where items are clubbed under their last vendor
export interface VendorGroup {
  vendor_cd: string;
  vendor_name: string;
  items: ClubbedItem[];
}