import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveBidviaBaseUrl,
  resolveBidviaBaseUrlFromEnv,
  resolveBidviaEnvironmentMode,
  resolveBidviaEnvironmentModeFromEnv,
} from '../src/config.ts';

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

test('resolveBidviaEnvironmentMode classifies fallback, public profiles, and explicit base URLs deterministically', () => {
  assert.equal(resolveBidviaEnvironmentMode(), 'local');
  assert.equal(resolveBidviaEnvironmentMode({ profile: 'global' }), 'production');
  assert.equal(resolveBidviaEnvironmentMode({ profile: 'china' }), 'production');
  assert.equal(resolveBidviaEnvironmentMode({ explicitBaseUrl: 'http://127.0.0.1:8787' }), 'local');
  assert.equal(resolveBidviaEnvironmentMode({ explicitBaseUrl: 'https://bidvia.ai' }), 'production');
  assert.equal(resolveBidviaEnvironmentMode({ explicitBaseUrl: 'https://bidvia.cn' }), 'production');
  assert.equal(resolveBidviaEnvironmentMode({ explicitBaseUrl: 'https://runtime.internal.bidvia.test' }), 'sim');
});

test('resolveBidviaEnvironmentModeFromEnv respects explicit baseUrl first, then profile, then local fallback', () => {
  assert.equal(resolveBidviaEnvironmentModeFromEnv({}), 'local');
  assert.equal(resolveBidviaEnvironmentModeFromEnv({ BIDVIA_BASE_URL_PROFILE: 'global' }), 'production');
  assert.equal(resolveBidviaEnvironmentModeFromEnv({ BIDVIA_BASE_URL_PROFILE: 'china' }), 'production');
  assert.equal(resolveBidviaEnvironmentModeFromEnv({ BIDVIA_BASE_URL: 'http://localhost:8787', BIDVIA_BASE_URL_PROFILE: 'global' }), 'local');
  assert.equal(resolveBidviaEnvironmentModeFromEnv({ BIDVIA_BASE_URL: 'https://staging.bidvia.internal' }), 'sim');
});
