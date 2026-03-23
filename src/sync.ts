import type { BidviaSyncUploadInput } from './contracts.js';

export function buildSyncUploadInput(cursorRef: string, objectCount: number, now: string): BidviaSyncUploadInput {
  return {
    cursorRef,
    objectCount,
    now,
  };
}
