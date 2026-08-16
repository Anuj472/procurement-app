// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PostgreSQL Table Types (matching exact schema)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface MItem {
  lf_no: string;
  item_description: string | null;
  item_type?: string | null;
  end_store?: string | null;
  stock_qty?: number | null;
  wip_qty?: number | null;
  drg_no?: string | null;
  user_sect?: string | null;
  uq?: string | null;
  status?: string | null;
}

export interface MParty {
  party_cd: string;
  party_nam: string | null;
  party_typ?: string | null;
  pty_add1?: string | null;
  pty_state?: string | null;
  pin_cd?: string | null;
  phone_no?: string | null;
  contact_person?: string | null;
  cp_desg?: string | null;
}

export interface PoOrder {
  po_no: string;
  po_dt: string | null;
  lf_no: string | null;
  po_qty: number | null;
  party_cd: string | null;
  unit_rate_wo_tax: number | null;
  unit_rate_tax: number | null;
  oustanding_qty: number | null;
  dp_dt: string | null;
  extended_dp_dt: string | null;
  status: string | null;
}

export interface ShisRecord {
  shis_no: string;
  shis_dt: string | null;
  lf_no: string | null;
  prop_qty: number | null;
  user_sec: string | null;
  pre_te_no?: string | null;
  pre_te_dt?: string | null;
  te_no?: string | null;
  te_dt?: string | null;
  te_open_dt?: string | null;
  te_usr?: string | null;
  po_no?: string | null;
  po_usr?: string | null;
  po_dt?: string | null;
  os_qty?: number | null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Clubbed Items (Tender Grouping)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ClubbedTableItem {
  lf_no: string;
  item_description: string;
  previous_vendors: string[];
  last_supplied_rate: number | null;
  total_shis_quantity: number;
}

export interface VendorPoolGroup {
  vendors: string[];
  items: ClubbedTableItem[];
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// VSL â€” Vendor Short List
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface VSLVendorEntry {
  party_cd: string;
  party_nam: string;
  remarks?: string;
  is_selected: boolean;
}

export interface VSLItemEntry {
  lf_no: string;
  item_description: string;
  required_qty: number;
}

export interface VSL {
  id: string;
  vsl_no: string;
  pre_te_no?: string;
  user_id?: string;
  vsl_dt: string;
  te_no?: string;
  tender_group_index?: number;
  vendors: VSLVendorEntry[];
  items: VSLItemEntry[];
  prepared_by?: string;
  status: 'Draft' | 'Issued' | 'Closed';
  created_at: string;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TEC â€” Technical Evaluation Committee
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface TECVendorEvaluation {
  id?: string;
  tec_no?: string;
  vendor_name: string;
  compliance_statement?: string;
  local_content_cert?: string;
  nda_cert?: string;
  non_blacklisted_cert?: string;
  land_border_cert?: string;
  msme_status?: string;
  participation_as?: string;
  gst_pct?: string;
  for_destination_delivery?: string;
  pre_integrity_pact?: string;
  emd_status?: string;
  registration_with_ofb?: string;
  clarifications?: string;
  user_section_remarks?: string;
  is_technically_suitable: boolean;
}

export interface TEC {
  tec_no: string;
  te_no: string;
  tec_dt: string;
  tender_opening_dt?: string;
  tec_level?: string;
  evaluations: TECVendorEvaluation[];
  committee_remarks?: string;
  prepared_by?: string;
  status: 'Draft' | 'Submitted' | 'Approved';
  created_at?: string;
  updated_at?: string;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TPC â€” Tender Purchase Committee
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface TPCVendorRate {
  party_cd: string;
  party_nam: string;
  quoted_rate: number | null;
  negotiated_rate: number | null;
  l1_rank?: number;
  remarks: string;
  selected: boolean;
}

export interface TPC {
  id: string;
  tpc_no: string;
  tpc_dt: string;
  tec_id: string;
  tec_no: string;
  vsl_no: string;
  vendor_rates: TPCVendorRate[];
  final_vendor_cd?: string;
  final_vendor_name?: string;
  approved_rate?: number;
  committee_remarks?: string;
  prepared_by?: string;
  status: 'Draft' | 'Approved' | 'PO Issued';
  created_at: string;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Modal & Tab State Helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ModalType =
  | 'clubbed'
  | 'shis-revalidation'
  | 'create-vsl'
  | 'create-tec'
  | 'create-tpc'
  | 'print-vsl'
  | 'print-tec'
  | 'print-tpc'
  | null;

export type ActiveTab = 'vsl' | 'tec' | 'tpc';

// --- Extended Pre-TE Types ---
export type TenderType = "OTE" | "STE" | "LTE";
export type BidType = "Single Bid" | "Double Bid";
export type TpcLevel = "Non-TPC" | "TPC Level-IV" | "TPC Level-III" | "TPC Level-II" | "TPC Level-I";

export interface PreTeRecord {
  pre_te_no: string;
  te_typ: TenderType;
  opt_cl: "Yes" | "No";
  opt_cl_pct?: number;
  tpc_lv: TpcLevel;
  head_cd: string;
  bid_typ: BidType;
  qty_dist: "Yes" | "No";
  qty_dist_ratio?: string;
  dp_days: number;
  gst_per: number;
  user_id: string;
  upd_dt: string;
  te_no?: string;
  lte_case_value?: number;
  sdote_case_value?: number;
  total_case_value?: number;
}


