import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bidviaNormalizationLayers,
  bidviaNormalizationSnapshotSources,
} from '../src/contracts.ts';
import {
  buildCanonicalInput,
  buildNormalizedWorkingView,
  normalizeCanonicalInput,
} from '../src/normalization.ts';
import type {
  BidviaCacheMetadata,
  BidviaCachedWorkingView,
  BidviaCanonicalInput,
  BidviaFreshnessMetadata,
  BidviaLocalSnapshotMetadata,
  BidviaNormalizedWorkingView,
} from '../src/contracts.ts';

function expectCanonicalInput(
  value: BidviaCanonicalInput<{ capabilityId: string; helperKey: string }>,
): BidviaCanonicalInput<{ capabilityId: string; helperKey: string }> {
  return value;
}

function expectNormalizedWorkingView(
  value: BidviaNormalizedWorkingView<
    { capabilityId: string; helperKey: string },
    { capabilityKey: string; helperKey: string }
  >,
): BidviaNormalizedWorkingView<
  { capabilityId: string; helperKey: string },
  { capabilityKey: string; helperKey: string }
> {
  return value;
}

function expectCachedWorkingView(
  value: BidviaCachedWorkingView<
    { capabilityId: string; helperKey: string },
    { capabilityKey: string; helperKey: string }
  >,
): BidviaCachedWorkingView<
  { capabilityId: string; helperKey: string },
  { capabilityKey: string; helperKey: string }
> {
  return value;
}

function expectFreshnessMetadata(
  value: BidviaFreshnessMetadata,
): BidviaFreshnessMetadata {
  return value;
}

test('normalization contracts keep canonical, normalized, cached, and freshness layers distinct', () => {
  assert.deepEqual(bidviaNormalizationLayers, [
    'canonical-input',
    'normalized-working-view',
    'cached-working-view',
    'local-snapshot-metadata',
    'cache-metadata',
    'freshness-metadata',
  ]);
  assert.deepEqual(bidviaNormalizationSnapshotSources, [
    'local-static',
    'server-derived',
    'deferred-server-negotiation',
  ]);

  const canonicalInput: BidviaCanonicalInput<{
    capabilityId: string;
    helperKey: string;
  }> = {
    layer: 'canonical-input',
    value: {
      capabilityId: 'server-route-1',
      helperKey: 'postHeartbeat',
    },
  };

  const normalizedView: BidviaNormalizedWorkingView<
    { capabilityId: string; helperKey: string },
    { capabilityKey: string; helperKey: string }
  > = {
    layer: 'normalized-working-view',
    canonical: canonicalInput,
    value: {
      capabilityKey: 'postHeartbeat',
      helperKey: 'postHeartbeat',
    },
  };

  const snapshot: BidviaLocalSnapshotMetadata = {
    layer: 'local-snapshot-metadata',
    source: 'server-derived',
    schemaVersion: '2026-03-27',
    capturedAt: '2026-03-27T00:00:00.000Z',
  };

  const cache: BidviaCacheMetadata = {
    layer: 'cache-metadata',
    cacheKey: 'server-capabilities:production',
    cachedAt: '2026-03-27T00:00:01.000Z',
  };

  const freshness: BidviaFreshnessMetadata = {
    layer: 'freshness-metadata',
    observedAt: '2026-03-27T00:00:01.000Z',
    stale: false,
    expiresAt: '2026-03-27T00:05:01.000Z',
  };

  const cachedView: BidviaCachedWorkingView<
    { capabilityId: string; helperKey: string },
    { capabilityKey: string; helperKey: string }
  > = {
    layer: 'cached-working-view',
    canonical: canonicalInput,
    normalized: normalizedView,
    snapshot,
    cache,
    freshness,
  };

  assert.equal(expectCanonicalInput(canonicalInput).layer, 'canonical-input');
  assert.equal(expectNormalizedWorkingView(normalizedView).layer, 'normalized-working-view');
  assert.equal(expectCachedWorkingView(cachedView).layer, 'cached-working-view');
  assert.equal(expectFreshnessMetadata(freshness).layer, 'freshness-metadata');

  assert.equal(cachedView.snapshot.source, 'server-derived');
  assert.equal(cachedView.cache.cacheKey, 'server-capabilities:production');
  assert.equal(cachedView.freshness.stale, false);
  assert.equal(cachedView.normalized.canonical.value.capabilityId, 'server-route-1');

  // @ts-expect-error normalized working views are not canonical inputs
  expectCanonicalInput(normalizedView);

  // @ts-expect-error cached working views are not freshness metadata
  expectFreshnessMetadata(cachedView);

  // @ts-expect-error snapshot metadata is separate from cache metadata
  const invalidCache: BidviaCacheMetadata = snapshot;

  void invalidCache;
});

test('normalizeCanonicalInput preserves rationale and explicit mapping semantics', () => {
  const canonical = buildCanonicalInput({
    capabilityId: 'server-route-1',
    helperKey: 'postHeartbeat',
  });

  const normalized = normalizeCanonicalInput({
    canonical,
    value: {
      capabilityKey: 'postHeartbeat',
      helperKey: 'postHeartbeat',
    },
    rationale: 'helperKey is the stable repo-local lookup key for normalized capability access',
    mappings: [
      {
        canonicalField: 'capabilityId',
        normalizedField: 'capabilityKey',
        rationale: 'the server capability identifier is normalized to the local capability key name',
      },
      {
        canonicalField: 'helperKey',
        normalizedField: 'helperKey',
        rationale: 'the helper key is preserved without rewriting',
      },
    ],
  });

  assert.deepEqual(normalized, {
    normalized: {
      layer: 'normalized-working-view',
      canonical,
      value: {
        capabilityKey: 'postHeartbeat',
        helperKey: 'postHeartbeat',
      },
    },
    rationale: 'helperKey is the stable repo-local lookup key for normalized capability access',
    mappings: [
      {
        canonicalField: 'capabilityId',
        normalizedField: 'capabilityKey',
        rationale: 'the server capability identifier is normalized to the local capability key name',
      },
      {
        canonicalField: 'helperKey',
        normalizedField: 'helperKey',
        rationale: 'the helper key is preserved without rewriting',
      },
    ],
  });
});

test('normalizeCanonicalInput does not infer authority in normalized output', () => {
  const canonical = buildCanonicalInput({
    helperKey: 'submitProposal',
    online: true,
    cachedAt: '2026-03-27T00:00:01.000Z',
  });

  const normalized = normalizeCanonicalInput({
    canonical,
    value: {
      helperKey: 'submitProposal',
      status: 'available',
    },
    rationale: 'runtime availability can be normalized for working use without creating governance authority',
    mappings: [
      {
        canonicalField: 'helperKey',
        normalizedField: 'helperKey',
        rationale: 'the helper key is preserved as-is',
      },
    ],
  });

  assert.equal(buildNormalizedWorkingView(canonical, normalized.normalized.value).layer, 'normalized-working-view');
  assert.equal('authority' in normalized, false);
  assert.equal('authority' in normalized.normalized.value, false);
  assert.equal(normalized.rationale.includes('authority'), true);
});
