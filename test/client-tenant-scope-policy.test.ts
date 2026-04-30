import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';

test('BidviaClient createListing fails closed when tenantId is missing', async () => {
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      principalId: 'principal-1',
      companyId: 'company-a',
    },
    fetchImpl: async () => {
      throw new Error('fetch should not be called when tenantId is missing');
    },
  });

  await assert.rejects(
    () => client.createListing({
      listingId: 'listing-1',
      listingType: 'supply',
      category: 'basic inorganic industrial chemical',
      sku: 'sodium-carbonate-soda-ash-light',
      quantityValue: '15',
      quantityUnit: 'tons',
      regionSummary: 'China -> Vietnam',
      verificationStatus: 'verified',
      freshnessTs: '2026-04-30T05:10:00Z',
      traceId: 'trace-1',
      idempotencyKey: 'listing-1',
      now: '2026-04-30T05:10:00Z',
    }),
    /tenantId is required/, 
  );
});

test('BidviaClient createCommercialAction fails closed when tenantId is missing', async () => {
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      principalId: 'principal-1',
      companyId: 'company-a',
    },
    fetchImpl: async () => {
      throw new Error('fetch should not be called when tenantId is missing');
    },
  });

  await assert.rejects(
    () => client.createCommercialAction({
      governedAction: 'OPPORTUNITY_PACKAGE_SEND',
      subjectType: 'OPPORTUNITY_PACKAGE',
      subjectId: 'pkg-1',
      traceId: 'trace-1',
      workflowId: 'wf-1',
      now: '2026-04-30T05:11:00Z',
    }),
    /tenantId is required/,
  );
});
