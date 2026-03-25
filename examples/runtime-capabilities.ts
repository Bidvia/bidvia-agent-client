import { buildLocalRuntimeCapabilitySnapshot } from '../src/runtime-capabilities.js';

console.log(JSON.stringify(buildLocalRuntimeCapabilitySnapshot({
  explicitBaseUrl: 'http://127.0.0.1:8787',
}), null, 2));
