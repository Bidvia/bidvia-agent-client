import { BidviaClient } from './client.js';
import type { BidviaScenarioVerificationBundle } from './contracts.js';
import {
  buildIndustryUniverseScenarioPlan,
} from './universe.js';
import type {
  BidviaIndustryUniverseScenarioPlan,
  BidviaIndustryUniverseScenarioPlanInput,
} from './universe.js';
import {
  buildScenarioVerificationBundle,
} from './verification.js';

export interface BidviaScenarioAdapter<Input, Output> {
  name: string;
  describe(): string;
  run(client: BidviaClient, input: Input): Promise<Output> | Output;
}

export interface BidviaIndustryUniverseAdapterResult {
  scenarioPlan: BidviaIndustryUniverseScenarioPlan;
  verificationBundle: BidviaScenarioVerificationBundle;
}

export const industryUniverseScenarioAdapter: BidviaScenarioAdapter<
  BidviaIndustryUniverseScenarioPlanInput,
  BidviaIndustryUniverseAdapterResult
> = {
  name: 'industry-universe-plan',
  describe() {
    return 'Builds a review-safe industry universe scenario plan payload.';
  },
  run(_client, input) {
    const scenarioPlan = buildIndustryUniverseScenarioPlan(input);
    const verificationBundle = buildScenarioVerificationBundle({
      scenario: scenarioPlan.envelope,
      verificationMode: 'review-safe',
    });

    return {
      scenarioPlan,
      verificationBundle,
    };
  },
};
