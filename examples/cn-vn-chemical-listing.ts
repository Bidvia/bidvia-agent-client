import { pathToFileURL } from 'node:url';
import { BidviaClient } from '../src/client.js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

/** Explicit invocation writes one unverified TEST draft; never activates, signs or ships. */
export async function runChemicalListingExample() {
  const baseUrl = required('BIDVIA_CHEMICAL_BASE_URL');
  const url = new URL(baseUrl);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('This TEST example is loopback-only');
  const listingId = required('BIDVIA_CHEMICAL_LISTING_ID');
  const client = new BidviaClient({ baseUrl, context: {
    tenantId: required('BIDVIA_CHEMICAL_TENANT_ID'), companyId: required('BIDVIA_CHEMICAL_COMPANY_ID'),
    principalId: required('BIDVIA_CHEMICAL_PRINCIPAL_ID'), adminSessionId: required('BIDVIA_CHEMICAL_ADMIN_SESSION_ID'),
  } });
  const now = required('BIDVIA_CHEMICAL_INPUT_TIME'); // Fixed input time permits exact idempotent replay.
  await client.createListing({ listingId, listingType: 'supply', category: 'industrial-chemicals', sku: 'CN-SODA-DENSE-IND-50KG',
    quantityValue: '20000', quantityUnit: 'kg', regionSummary: 'TEST China pickup — point unconfirmed', verificationStatus: 'unverified',
    freshnessTs: now, traceId: `${listingId}:trace`, idempotencyKey: `${listingId}:create`, now,
    chemicalSpecification: { schema_version: 1, profile: 'CN_VN_SODA_ASH_RESEARCH_V1', export_country: 'CN', import_country: 'VN',
      cas: '497-19-8', grade: 'INDUSTRIAL', form: 'DENSE', package_net_kg: 50, dry_alkali_min_pct: 99.5, documents: [] },
  });
  return client.previewChemicalQuotation({ listingId, expectedListingVersion: 1, commercialTerms: {
    indicative_usd_cents_per_mt: null, seller_legal_name: null, buyer_legal_name: null, named_delivery_point: null,
    payment_terms: null, shipment_window: null, governing_law_and_cisg: null, dispute_resolution: null,
  } });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runChemicalListingExample().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
    console.error(error instanceof Error ? error.message : 'Chemical example failed'); process.exitCode = 1;
  });
}
