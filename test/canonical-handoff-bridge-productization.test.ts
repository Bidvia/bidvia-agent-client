import test from 'node:test';
import assert from 'node:assert/strict';

import { consumeOperatorHandoff } from '../src/business-universe/operator.ts';

test('canonical handoff bridge keeps operator readback executable on the returned source listing id', async () => {
  const result = await consumeOperatorHandoff({
    listOperatorMatches: async ({ sourceListingId }: { sourceListingId: string }) => ({
      items: [{ source_listing_id: sourceListingId, handoff_class: 'canonical-bridge' }],
    }),
  } as never, {
    sourceListingId: 'canonical-source-1',
  });

  assert.equal(result.items[0].source_listing_id, 'canonical-source-1');
  assert.equal(result.items[0].handoff_class, 'canonical-bridge');
});
