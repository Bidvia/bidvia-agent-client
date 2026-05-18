import type { BidviaClient } from '../client.js';
import type { BidviaStageKey, BidviaStageSnapshot } from './contracts.js';

export interface BidviaPlatformManagedStageResult {
  stageSnapshot: BidviaStageSnapshot;
}

export interface BidviaPlatformManagedFacade {
  entry: {
    inspect: () => Promise<BidviaPlatformManagedStageResult>;
  };
  readiness: {
    inspect: () => Promise<BidviaPlatformManagedStageResult>;
  };
  progression: {
    run: () => Promise<BidviaPlatformManagedStageResult>;
  };
}

function buildPlatformManagedLaterWaveStop(
  stage: BidviaStageKey,
  recommendedNextStep: string,
): BidviaPlatformManagedStageResult {
  return {
    stageSnapshot: {
      roleWorkspace: {
        role: 'platform-managed',
        sessionPresent: false,
        adminSessionPresent: false,
        canonicality: 'later-wave',
      },
      stage,
      state: 'later-wave-stop',
      executability: 'later-wave-stop',
      recommendedNextStep,
      nextStepKind: 'later_wave_stop',
      action: {
        kind: 'read',
        owner: 'platform-managed',
        executability: 'later-wave-stop',
      },
      boundary: {
        boundaryClass: 'later-wave-stop',
        reasonCodes: ['platform_managed_role_deferred_to_wave_8'],
      },
    },
  };
}

export async function inspectPlatformManagedEntry(): Promise<BidviaPlatformManagedStageResult> {
  return buildPlatformManagedLaterWaveStop('entry', 'stop_platform_managed_entry');
}

export async function inspectPlatformManagedReadiness(): Promise<BidviaPlatformManagedStageResult> {
  return buildPlatformManagedLaterWaveStop('readiness', 'stop_platform_managed_readiness');
}

export async function runPlatformManagedProgression(): Promise<BidviaPlatformManagedStageResult> {
  return buildPlatformManagedLaterWaveStop('progression', 'stop_platform_managed_progression');
}

export function createBidviaPlatformManagedFacade(_client: BidviaClient): BidviaPlatformManagedFacade {
  return {
    entry: {
      inspect: () => inspectPlatformManagedEntry(),
    },
    readiness: {
      inspect: () => inspectPlatformManagedReadiness(),
    },
    progression: {
      run: () => runPlatformManagedProgression(),
    },
  };
}
