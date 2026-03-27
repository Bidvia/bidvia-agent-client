import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  BidviaPricingBasisObject,
  BidviaPricingConsumption,
  BidviaPricingExplanation,
  BidviaPricingQuotationMethodModule,
  BidviaPricingQuotationObject,
  BidviaPricingQuoteTemplate,
  BidviaPricingRuleAtom,
} from '../src/contracts.ts';

function expectPricingConsumption(value: BidviaPricingConsumption): BidviaPricingConsumption {
  return value;
}

function expectPricingExplanation(value: BidviaPricingExplanation): BidviaPricingExplanation {
  return value;
}

test('pricing contracts keep basis, rule atom, quotation method module, quote template, and quotation object distinct', () => {
  const pricingBasis: BidviaPricingBasisObject = {
    pricingBasisId: 'basis-1',
    basisType: 'spot-market',
    label: 'FOB Ningbo spot basis',
    observedAt: '2026-03-27T00:00:00.000Z',
    termsSummary: 'FOB Ningbo USD per metric ton',
  };

  const ruleAtom: BidviaPricingRuleAtom = {
    pricingRuleAtomId: 'rule-1',
    ruleType: 'adjustment',
    label: 'Add handling surcharge',
    operator: 'add',
    operandDescription: 'USD 12 per metric ton',
  };

  const quotationMethodModule: BidviaPricingQuotationMethodModule = {
    quotationMethodModuleId: 'module-1',
    methodType: 'formula',
    label: 'Spot basis plus adjustments',
    pricingBasisIds: ['basis-1'],
    pricingRuleAtomIds: ['rule-1'],
  };

  const quoteTemplate: BidviaPricingQuoteTemplate = {
    quoteTemplateId: 'template-1',
    templateType: 'buyer-facing',
    label: 'Buyer spot quote template',
    quotationMethodModuleId: 'module-1',
    requiredFieldLabels: ['incoterm', 'currency', 'validity window'],
  };

  const quotationObject: BidviaPricingQuotationObject = {
    quotationObjectId: 'quote-1',
    quoteTemplateId: 'template-1',
    quotationMethodModuleId: 'module-1',
    pricingBasisId: 'basis-1',
    pricingRuleAtomIds: ['rule-1'],
    presentedAt: '2026-03-27T00:05:00.000Z',
    status: 'quoted',
    displaySummary: 'FOB Ningbo spot quote with handling surcharge',
  };

  const consumption: BidviaPricingConsumption = {
    pricingBasis,
    ruleAtoms: [ruleAtom],
    quotationMethodModule,
    quoteTemplate,
    quotationObject,
  };

  assert.equal(expectPricingConsumption(consumption).pricingBasis.pricingBasisId, 'basis-1');
  assert.equal(consumption.ruleAtoms[0]?.pricingRuleAtomId, 'rule-1');
  assert.equal(consumption.quotationMethodModule.quotationMethodModuleId, 'module-1');
  assert.equal(consumption.quoteTemplate.quoteTemplateId, 'template-1');
  assert.equal(consumption.quotationObject.quotationObjectId, 'quote-1');

  // @ts-expect-error quote templates are not quotation objects
  const invalidQuotationObject: BidviaPricingQuotationObject = quoteTemplate;

  void invalidQuotationObject;
});

test('pricing helpers consume pricing objects and explain dependency structure without finalizing pricing truth', async () => {
  const pricingModule = await import('../src/index.ts');

  assert.equal(typeof pricingModule.consumePricingObjectFamily, 'function');
  assert.equal(typeof pricingModule.explainPricingConsumption, 'function');

  const consumption = pricingModule.consumePricingObjectFamily({
    pricingBasis: {
      pricingBasisId: 'basis-1',
      basisType: 'spot-market',
      label: 'FOB Ningbo spot basis',
      observedAt: '2026-03-27T00:00:00.000Z',
      termsSummary: 'FOB Ningbo USD per metric ton',
    },
    ruleAtoms: [{
      pricingRuleAtomId: 'rule-1',
      ruleType: 'adjustment',
      label: 'Add handling surcharge',
      operator: 'add',
      operandDescription: 'USD 12 per metric ton',
    }],
    quotationMethodModule: {
      quotationMethodModuleId: 'module-1',
      methodType: 'formula',
      label: 'Spot basis plus adjustments',
      pricingBasisIds: ['basis-1'],
      pricingRuleAtomIds: ['rule-1'],
    },
    quoteTemplate: {
      quoteTemplateId: 'template-1',
      templateType: 'buyer-facing',
      label: 'Buyer spot quote template',
      quotationMethodModuleId: 'module-1',
      requiredFieldLabels: ['incoterm', 'currency', 'validity window'],
    },
    quotationObject: {
      quotationObjectId: 'quote-1',
      quoteTemplateId: 'template-1',
      quotationMethodModuleId: 'module-1',
      pricingBasisId: 'basis-1',
      pricingRuleAtomIds: ['rule-1'],
      presentedAt: '2026-03-27T00:05:00.000Z',
      status: 'quoted',
      displaySummary: 'FOB Ningbo spot quote with handling surcharge',
    },
  });

  const explanation = pricingModule.explainPricingConsumption(consumption);

  assert.equal(expectPricingConsumption(consumption).quoteTemplate.quoteTemplateId, 'template-1');
  assert.deepEqual(expectPricingExplanation(explanation), {
    pricingBasisId: 'basis-1',
    quotationMethodModuleId: 'module-1',
    quoteTemplateId: 'template-1',
    quotationObjectId: 'quote-1',
    pricingRuleAtomIds: ['rule-1'],
    dependencySummary: {
      pricingBasisLabel: 'FOB Ningbo spot basis',
      quotationMethodModuleLabel: 'Spot basis plus adjustments',
      quoteTemplateLabel: 'Buyer spot quote template',
      quotationObjectStatus: 'quoted',
      pricingRuleAtomLabels: ['Add handling surcharge'],
    },
    explanationLines: [
      'quotation quote-1 depends on pricing basis basis-1 (FOB Ningbo spot basis)',
      'quotation quote-1 uses quotation method module module-1 (Spot basis plus adjustments)',
      'quotation quote-1 is rendered through quote template template-1 (Buyer spot quote template)',
      'quotation quote-1 references pricing rule atoms: rule-1 (Add handling surcharge)',
      'pricing remains a consumed quotation object and is not finalized as client-owned truth',
    ],
  });
  assert.equal('price' in explanation, false);
  assert.equal(explanation.explanationLines.at(-1)?.includes('not finalized'), true);
});
