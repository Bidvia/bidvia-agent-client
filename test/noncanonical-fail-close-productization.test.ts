import test from 'node:test';
import assert from 'node:assert/strict';

import { inspectOperatorHandoffFailure } from '../src/business-universe/operator.ts';

test('non-canonical mixed-family operator handoff remains fail-closed in the product layer', () => {
  const snapshot = inspectOperatorHandoffFailure({
    status: 404,
    body: {
      error: {
        code: 'source_listing_not_found',
        message: 'source listing not found within authorized tenant/company scope',
      },
    },
    tenantId: 'tenant-public',
    principalId: 'operator-system',
    authorizedCompanyId: 'company-public',
  });

  assert.equal(snapshot.executability, 'non-canonical-fail-close');
  assert.equal(snapshot.action?.executability, 'non-canonical-fail-close');
});
