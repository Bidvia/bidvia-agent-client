import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveBidviaBaseUrl, resolveBidviaBaseUrlFromEnv } from '../src/config.ts';

test('resolveBidviaBaseUrl supports only public domain profiles plus explicit override priority', () => {
  assert.equal(resolveBidviaBaseUrl({ profile: 'global' }), 'https://bidvia.ai');
  assert.equal(resolveBidviaBaseUrl({ profile: 'china' }), 'https://bidvia.cn');
  assert.equal(resolveBidviaBaseUrl({ profile: 'china', explicitBaseUrl: 'https://api.bidvia.cn' }), 'https://api.bidvia.cn');
});

test('resolveBidviaBaseUrlFromEnv keeps local fallback internal when no public profile is selected', () => {
  assert.equal(resolveBidviaBaseUrlFromEnv({}), 'http://127.0.0.1:8787');
  assert.equal(resolveBidviaBaseUrlFromEnv({ BIDVIA_BASE_URL_PROFILE: 'global' }), 'https://bidvia.ai');
  assert.equal(resolveBidviaBaseUrlFromEnv({ BIDVIA_BASE_URL_PROFILE: 'china' }), 'https://bidvia.cn');
  assert.equal(resolveBidviaBaseUrlFromEnv({ BIDVIA_BASE_URL: 'https://runtime.bidvia.ai', BIDVIA_BASE_URL_PROFILE: 'china' }), 'https://runtime.bidvia.ai');
});
