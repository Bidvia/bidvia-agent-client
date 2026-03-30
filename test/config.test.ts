import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveBidviaBaseUrl,
  resolveBidviaBaseUrlFromEnv,
  resolveBidviaEnvironmentMode,
  resolveBidviaEnvironmentModeFromEnv,
} from '../src/config.ts';

test('resolveBidviaBaseUrl defaults to the public global API and still supports public profiles plus explicit override priority', () => {
  assert.equal(resolveBidviaBaseUrl(), 'https://api.bidvia.ai');
  assert.equal(resolveBidviaBaseUrl({ profile: 'global' }), 'https://api.bidvia.ai');
  assert.equal(resolveBidviaBaseUrl({ profile: 'china' }), 'https://api.bidvia.cn');
  assert.equal(resolveBidviaBaseUrl({ explicitBaseUrl: 'http://127.0.0.1:8787' }), 'http://127.0.0.1:8787');
  assert.equal(resolveBidviaBaseUrl({ profile: 'china', explicitBaseUrl: 'https://api.bidvia.cn' }), 'https://api.bidvia.cn');
});

test('resolveBidviaBaseUrlFromEnv defaults to the public global API unless an explicit override or public profile is selected', () => {
  assert.equal(resolveBidviaBaseUrlFromEnv({}), 'https://api.bidvia.ai');
  assert.equal(resolveBidviaBaseUrlFromEnv({ BIDVIA_BASE_URL_PROFILE: 'global' }), 'https://api.bidvia.ai');
  assert.equal(resolveBidviaBaseUrlFromEnv({ BIDVIA_BASE_URL_PROFILE: 'china' }), 'https://api.bidvia.cn');
  assert.equal(resolveBidviaBaseUrlFromEnv({ BIDVIA_BASE_URL: 'http://127.0.0.1:8787' }), 'http://127.0.0.1:8787');
  assert.equal(resolveBidviaBaseUrlFromEnv({ BIDVIA_BASE_URL: 'https://runtime.bidvia.ai', BIDVIA_BASE_URL_PROFILE: 'china' }), 'https://runtime.bidvia.ai');
});

test('resolveBidviaEnvironmentMode classifies the public default, explicit local override, and explicit sim URLs deterministically', () => {
  assert.equal(resolveBidviaEnvironmentMode(), 'production');
  assert.equal(resolveBidviaEnvironmentMode({ profile: 'global' }), 'production');
  assert.equal(resolveBidviaEnvironmentMode({ profile: 'china' }), 'production');
  assert.equal(resolveBidviaEnvironmentMode({ explicitBaseUrl: 'http://127.0.0.1:8787' }), 'local');
  assert.notEqual(resolveBidviaEnvironmentMode({ explicitBaseUrl: 'http://127.0.0.1:8787' }), 'sim');
  assert.equal(resolveBidviaEnvironmentMode({ explicitBaseUrl: 'https://bidvia.ai' }), 'production');
  assert.equal(resolveBidviaEnvironmentMode({ explicitBaseUrl: 'https://bidvia.cn' }), 'production');
  assert.equal(resolveBidviaEnvironmentMode({ explicitBaseUrl: 'https://api.bidvia.ai' }), 'production');
  assert.equal(resolveBidviaEnvironmentMode({ explicitBaseUrl: 'https://api.bidvia.cn' }), 'production');
  assert.equal(resolveBidviaEnvironmentMode({ explicitBaseUrl: 'https://runtime.internal.bidvia.test' }), 'sim');
  assert.notEqual(resolveBidviaEnvironmentMode({ explicitBaseUrl: 'https://runtime.internal.bidvia.test' }), 'local');
});

test('resolveBidviaEnvironmentModeFromEnv respects explicit baseUrl first, then profile, then the public default', () => {
  assert.equal(resolveBidviaEnvironmentModeFromEnv({}), 'production');
  assert.equal(resolveBidviaEnvironmentModeFromEnv({ BIDVIA_BASE_URL_PROFILE: 'global' }), 'production');
  assert.equal(resolveBidviaEnvironmentModeFromEnv({ BIDVIA_BASE_URL_PROFILE: 'china' }), 'production');
  assert.equal(resolveBidviaEnvironmentModeFromEnv({ BIDVIA_BASE_URL: 'http://localhost:8787', BIDVIA_BASE_URL_PROFILE: 'global' }), 'local');
  assert.equal(resolveBidviaEnvironmentModeFromEnv({ BIDVIA_BASE_URL: 'https://staging.bidvia.internal' }), 'sim');
});
