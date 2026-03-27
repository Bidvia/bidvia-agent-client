import type {
  BidviaCanonicalInput,
  BidviaNormalizedWorkingView,
} from './contracts.js';

export interface BidviaNormalizationMapping {
  canonicalField: string;
  normalizedField: string;
  rationale: string;
}

export interface NormalizeCanonicalInputOptions<CanonicalValue, NormalizedValue> {
  canonical: BidviaCanonicalInput<CanonicalValue>;
  value: NormalizedValue;
  rationale: string;
  mappings: BidviaNormalizationMapping[];
}

export interface BidviaNormalizedCanonicalInput<CanonicalValue, NormalizedValue> {
  normalized: BidviaNormalizedWorkingView<CanonicalValue, NormalizedValue>;
  rationale: string;
  mappings: BidviaNormalizationMapping[];
}

export function buildCanonicalInput<Value>(value: Value): BidviaCanonicalInput<Value> {
  return {
    layer: 'canonical-input',
    value,
  };
}

export function buildNormalizedWorkingView<CanonicalValue, NormalizedValue>(
  canonical: BidviaCanonicalInput<CanonicalValue>,
  value: NormalizedValue,
): BidviaNormalizedWorkingView<CanonicalValue, NormalizedValue> {
  return {
    layer: 'normalized-working-view',
    canonical,
    value,
  };
}

export function normalizeCanonicalInput<CanonicalValue, NormalizedValue>({
  canonical,
  value,
  rationale,
  mappings,
}: NormalizeCanonicalInputOptions<CanonicalValue, NormalizedValue>): BidviaNormalizedCanonicalInput<
  CanonicalValue,
  NormalizedValue
> {
  return {
    normalized: buildNormalizedWorkingView(canonical, value),
    rationale,
    mappings: mappings.map((mapping) => ({ ...mapping })),
  };
}
