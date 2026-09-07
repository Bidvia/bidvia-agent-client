/** Original-file intake metadata. Claims are human-entered, not OCR/qualification. */
export interface BidviaChemicalDocumentUploadInput {
  expected_listing_version: number;
  idempotency_key: string;
  kind: 'TDS' | 'COA' | 'SDS';
  data_class: 'SUPPLIER_SUBMITTED' | 'TEST_FIXTURE';
  file_name: string;
  media_type: 'application/pdf' | 'text/plain';
  content_base64: string;
  issuer_name: string;
  issued_on: string;
  expires_on: string | null;
  source_reference: string;
  claims: { cas: string; grade: string | null; form: string | null; dry_alkali_pct: number | null; lot_number: string | null };
}
export interface BidviaChemicalDocumentReviewInput {
  expected_listing_version: number;
  content_sha256: string;
  idempotency_key: string;
  decision: 'CONSISTENT' | 'REJECTED';
  rationale: string;
  checks: { source_authenticity: boolean; specification: boolean; currency: boolean; batch_traceability: boolean };
}
