/** Draft negotiation only; Core owns parties, versions, totals and lifecycle. */
export interface BidviaChemicalRfqInput {
  idempotency_key: string;
  demand_listing_id: string;
  supply_listing_id: string;
  expected_demand_version: number;
  expected_supply_version: number;
  buyer_legal_name: string;
  request_note: string;
  data_class: 'TEST_FIXTURE' | 'USER_DRAFT';
}
export interface BidviaChemicalOfferInput {
  idempotency_key: string;
  expected_rfq_version: number;
  pricing_basis_id: string;
  usd_cents_per_mt: number;
  seller_legal_name: string;
  named_delivery_point: string;
  payment_terms: string;
  shipment_window: string;
  governing_law_and_cisg: string | null;
  dispute_resolution: string | null;
  valid_until: string;
  share_documents_with_buyer: true;
}
export interface BidviaChemicalDecisionInput {
  idempotency_key: string;
  expected_rfq_version: number;
  offer_id: string;
  offer_digest: string;
  decision: 'ACCEPT_FOR_DRAFT' | 'REJECT';
  rationale: string;
}
