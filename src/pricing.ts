import type {
  BidviaPricingBasisObject,
  BidviaPricingConsumption,
  BidviaPricingExplanation,
  BidviaPricingQuotationMethodModule,
  BidviaPricingQuotationObject,
  BidviaPricingQuoteTemplate,
  BidviaPricingRuleAtom,
} from './contracts.js';

function clonePricingBasisObject(pricingBasis: BidviaPricingBasisObject): BidviaPricingBasisObject {
  return {
    ...pricingBasis,
  };
}

function clonePricingRuleAtom(ruleAtom: BidviaPricingRuleAtom): BidviaPricingRuleAtom {
  return {
    ...ruleAtom,
  };
}

function cloneQuotationMethodModule(
  quotationMethodModule: BidviaPricingQuotationMethodModule,
): BidviaPricingQuotationMethodModule {
  return {
    ...quotationMethodModule,
    pricingBasisIds: [...quotationMethodModule.pricingBasisIds],
    pricingRuleAtomIds: [...quotationMethodModule.pricingRuleAtomIds],
  };
}

function cloneQuoteTemplate(quoteTemplate: BidviaPricingQuoteTemplate): BidviaPricingQuoteTemplate {
  return {
    ...quoteTemplate,
    requiredFieldLabels: [...quoteTemplate.requiredFieldLabels],
  };
}

function cloneQuotationObject(quotationObject: BidviaPricingQuotationObject): BidviaPricingQuotationObject {
  return {
    ...quotationObject,
    pricingRuleAtomIds: [...quotationObject.pricingRuleAtomIds],
  };
}

function clonePricingConsumption(input: BidviaPricingConsumption): BidviaPricingConsumption {
  return {
    pricingBasis: clonePricingBasisObject(input.pricingBasis),
    ruleAtoms: input.ruleAtoms.map(clonePricingRuleAtom),
    quotationMethodModule: cloneQuotationMethodModule(input.quotationMethodModule),
    quoteTemplate: cloneQuoteTemplate(input.quoteTemplate),
    quotationObject: cloneQuotationObject(input.quotationObject),
  };
}

function freezePricingConsumption(input: BidviaPricingConsumption): BidviaPricingConsumption {
  Object.freeze(input.quotationMethodModule.pricingBasisIds);
  Object.freeze(input.quotationMethodModule.pricingRuleAtomIds);
  Object.freeze(input.quoteTemplate.requiredFieldLabels);
  Object.freeze(input.quotationObject.pricingRuleAtomIds);
  input.ruleAtoms.forEach(Object.freeze);
  Object.freeze(input.ruleAtoms);
  Object.freeze(input.pricingBasis);
  Object.freeze(input.quotationMethodModule);
  Object.freeze(input.quoteTemplate);
  Object.freeze(input.quotationObject);
  return Object.freeze(input);
}

function freezePricingExplanation(explanation: BidviaPricingExplanation): BidviaPricingExplanation {
  Object.freeze(explanation.pricingRuleAtomIds);
  Object.freeze(explanation.dependencySummary.pricingRuleAtomLabels);
  Object.freeze(explanation.dependencySummary);
  Object.freeze(explanation.explanationLines);
  return Object.freeze(explanation);
}

export function consumePricingObjectFamily(input: BidviaPricingConsumption): BidviaPricingConsumption {
  return freezePricingConsumption(clonePricingConsumption(input));
}

export function explainPricingConsumption(
  pricingConsumption: BidviaPricingConsumption,
): BidviaPricingExplanation {
  const consumedPricing = consumePricingObjectFamily(pricingConsumption);
  const ruleAtomLabels = consumedPricing.ruleAtoms.map((ruleAtom) => ruleAtom.label);
  const ruleAtomReference = consumedPricing.ruleAtoms
    .map((ruleAtom) => `${ruleAtom.pricingRuleAtomId} (${ruleAtom.label})`)
    .join(', ');

  return freezePricingExplanation({
    pricingBasisId: consumedPricing.pricingBasis.pricingBasisId,
    quotationMethodModuleId: consumedPricing.quotationMethodModule.quotationMethodModuleId,
    quoteTemplateId: consumedPricing.quoteTemplate.quoteTemplateId,
    quotationObjectId: consumedPricing.quotationObject.quotationObjectId,
    pricingRuleAtomIds: consumedPricing.ruleAtoms.map((ruleAtom) => ruleAtom.pricingRuleAtomId),
    dependencySummary: {
      pricingBasisLabel: consumedPricing.pricingBasis.label,
      quotationMethodModuleLabel: consumedPricing.quotationMethodModule.label,
      quoteTemplateLabel: consumedPricing.quoteTemplate.label,
      quotationObjectStatus: consumedPricing.quotationObject.status,
      pricingRuleAtomLabels: ruleAtomLabels,
    },
    explanationLines: [
      `quotation ${consumedPricing.quotationObject.quotationObjectId} depends on pricing basis ${consumedPricing.pricingBasis.pricingBasisId} (${consumedPricing.pricingBasis.label})`,
      `quotation ${consumedPricing.quotationObject.quotationObjectId} uses quotation method module ${consumedPricing.quotationMethodModule.quotationMethodModuleId} (${consumedPricing.quotationMethodModule.label})`,
      `quotation ${consumedPricing.quotationObject.quotationObjectId} is rendered through quote template ${consumedPricing.quoteTemplate.quoteTemplateId} (${consumedPricing.quoteTemplate.label})`,
      `quotation ${consumedPricing.quotationObject.quotationObjectId} references pricing rule atoms: ${ruleAtomReference}`,
      'pricing remains a consumed quotation object and is not finalized as client-owned truth',
    ],
  });
}
