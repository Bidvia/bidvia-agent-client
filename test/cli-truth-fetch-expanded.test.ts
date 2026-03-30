import test from 'node:test';
import assert from 'node:assert/strict';

import { runCli } from '../src/cli.ts';

function setEnvVar(name: string, value: string | undefined) {
  const previousValue = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  return () => {
    if (previousValue === undefined) {
      delete process.env[name];
      return;
    }

    process.env[name] = previousValue;
  };
}

test('runCli help lists the expanded truth-fetch family commands under the visibility group', async () => {
  const lines: string[] = [];

  const exitCode = await runCli(['--help'], {
    printLine: (value) => {
      lines.push(value);
    },
    printJson: () => {
      throw new Error('help should not print json');
    },
  });

  assert.equal(exitCode, 0);
  assert(lines.includes('  canonical-semantic-labels'));
  assert(lines.includes('  canonical-semantic-label --label-id ...'));
  assert(lines.includes('  canonical-semantic-mappings'));
  assert(lines.includes('  canonical-semantic-mapping --mapping-id ...'));
  assert(lines.includes('  canonical-semantic-taxonomy-entries'));
  assert(lines.includes('  canonical-semantic-taxonomy-entry --taxonomy-entry-id ...'));
  assert(lines.includes('  canonical-semantic-lineage-links'));
  assert(lines.includes('  canonical-semantic-lineage-link --lineage-link-id ...'));
  assert(lines.includes('  pricing-rule-atoms'));
  assert(lines.includes('  pricing-rule-atom --pricing-rule-atom-id ...'));
  assert(lines.includes('  pricing-quotation-method-modules'));
  assert(lines.includes('  pricing-quotation-method-module --pricing-quotation-method-module-id ...'));
  assert(lines.includes('  pricing-quote-templates'));
  assert(lines.includes('  pricing-quote-template --pricing-quote-template-id ...'));
  assert(lines.includes('  pricing-quotations'));
  assert(lines.includes('  pricing-quotation --pricing-quotation-id ...'));
  assert(lines.includes('  pricing-explanations'));
  assert(lines.includes('  pricing-explanation --pricing-explanation-id ...'));
  assert(lines.includes('  file-resources'));
  assert(lines.includes('  file-resource --file-resource-id ...'));
  assert(lines.includes('  target-attachment-bindings --target-ref ...'));
});

test('runCli returns structured missing required-id failures for expanded truth-fetch detail and target-bound commands', async () => {
  const cases = [
    ['canonical-semantic-label', '--label-id'],
    ['canonical-semantic-mapping', '--mapping-id'],
    ['canonical-semantic-taxonomy-entry', '--taxonomy-entry-id'],
    ['canonical-semantic-lineage-link', '--lineage-link-id'],
    ['pricing-rule-atom', '--pricing-rule-atom-id'],
    ['pricing-quotation-method-module', '--pricing-quotation-method-module-id'],
    ['pricing-quote-template', '--pricing-quote-template-id'],
    ['pricing-quotation', '--pricing-quotation-id'],
    ['pricing-explanation', '--pricing-explanation-id'],
    ['file-resource', '--file-resource-id'],
    ['target-attachment-bindings', '--target-ref'],
  ] as const;

  for (const [command, flag] of cases) {
    const printed: unknown[] = [];

    const exitCode = await runCli([command], {
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('missing required-id failures should not print help');
      },
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(printed, [{
      error: {
        code: 'invalid-input',
        command,
        message: `Missing required ${flag} for ${command}.`,
        details: [flag],
      },
    }]);
  }
});

test('runCli routes expanded truth-fetch commands through the matching SDK method and prints JSON results', async () => {
  const clientCreateCalls: unknown[] = [];
  const truthFetchClient = {
    async listCanonicalSemanticLabels() {
      return { method: 'listCanonicalSemanticLabels' };
    },
    async getCanonicalSemanticLabel(labelId: string) {
      return { method: 'getCanonicalSemanticLabel', labelId };
    },
    async listCanonicalSemanticMappings() {
      return { method: 'listCanonicalSemanticMappings' };
    },
    async getCanonicalSemanticMapping(mappingId: string) {
      return { method: 'getCanonicalSemanticMapping', mappingId };
    },
    async listCanonicalSemanticTaxonomyEntries() {
      return { method: 'listCanonicalSemanticTaxonomyEntries' };
    },
    async getCanonicalSemanticTaxonomyEntry(taxonomyEntryId: string) {
      return { method: 'getCanonicalSemanticTaxonomyEntry', taxonomyEntryId };
    },
    async listCanonicalSemanticLineageLinks() {
      return { method: 'listCanonicalSemanticLineageLinks' };
    },
    async getCanonicalSemanticLineageLink(lineageLinkId: string) {
      return { method: 'getCanonicalSemanticLineageLink', lineageLinkId };
    },
    async listPricingRuleAtoms() {
      return { method: 'listPricingRuleAtoms' };
    },
    async getPricingRuleAtom(pricingRuleAtomId: string) {
      return { method: 'getPricingRuleAtom', pricingRuleAtomId };
    },
    async listPricingQuotationMethodModules() {
      return { method: 'listPricingQuotationMethodModules' };
    },
    async getPricingQuotationMethodModule(pricingQuotationMethodModuleId: string) {
      return { method: 'getPricingQuotationMethodModule', pricingQuotationMethodModuleId };
    },
    async listPricingQuoteTemplates() {
      return { method: 'listPricingQuoteTemplates' };
    },
    async getPricingQuoteTemplate(pricingQuoteTemplateId: string) {
      return { method: 'getPricingQuoteTemplate', pricingQuoteTemplateId };
    },
    async listPricingQuotations() {
      return { method: 'listPricingQuotations' };
    },
    async getPricingQuotation(pricingQuotationId: string) {
      return { method: 'getPricingQuotation', pricingQuotationId };
    },
    async listPricingExplanations() {
      return { method: 'listPricingExplanations' };
    },
    async getPricingExplanation(pricingExplanationId: string) {
      return { method: 'getPricingExplanation', pricingExplanationId };
    },
    async listFileResources() {
      return { method: 'listFileResources' };
    },
    async getFileResource(fileResourceId: string) {
      return { method: 'getFileResource', fileResourceId };
    },
    async listTargetAttachmentBindings(targetRef: string) {
      return { method: 'listTargetAttachmentBindings', targetRef };
    },
  };

  const cases = [
    {
      argv: ['canonical-semantic-labels'],
      expected: { method: 'listCanonicalSemanticLabels' },
    },
    {
      argv: ['canonical-semantic-label', '--label-id', 'label-1'],
      expected: { method: 'getCanonicalSemanticLabel', labelId: 'label-1' },
    },
    {
      argv: ['canonical-semantic-mappings'],
      expected: { method: 'listCanonicalSemanticMappings' },
    },
    {
      argv: ['canonical-semantic-mapping', '--mapping-id', 'mapping-1'],
      expected: { method: 'getCanonicalSemanticMapping', mappingId: 'mapping-1' },
    },
    {
      argv: ['canonical-semantic-taxonomy-entries'],
      expected: { method: 'listCanonicalSemanticTaxonomyEntries' },
    },
    {
      argv: ['canonical-semantic-taxonomy-entry', '--taxonomy-entry-id', 'taxonomy-1'],
      expected: { method: 'getCanonicalSemanticTaxonomyEntry', taxonomyEntryId: 'taxonomy-1' },
    },
    {
      argv: ['canonical-semantic-lineage-links'],
      expected: { method: 'listCanonicalSemanticLineageLinks' },
    },
    {
      argv: ['canonical-semantic-lineage-link', '--lineage-link-id', 'lineage-1'],
      expected: { method: 'getCanonicalSemanticLineageLink', lineageLinkId: 'lineage-1' },
    },
    {
      argv: ['pricing-rule-atoms'],
      expected: { method: 'listPricingRuleAtoms' },
    },
    {
      argv: ['pricing-rule-atom', '--pricing-rule-atom-id', 'rule-1'],
      expected: { method: 'getPricingRuleAtom', pricingRuleAtomId: 'rule-1' },
    },
    {
      argv: ['pricing-quotation-method-modules'],
      expected: { method: 'listPricingQuotationMethodModules' },
    },
    {
      argv: ['pricing-quotation-method-module', '--pricing-quotation-method-module-id', 'module-1'],
      expected: {
        method: 'getPricingQuotationMethodModule',
        pricingQuotationMethodModuleId: 'module-1',
      },
    },
    {
      argv: ['pricing-quote-templates'],
      expected: { method: 'listPricingQuoteTemplates' },
    },
    {
      argv: ['pricing-quote-template', '--pricing-quote-template-id', 'template-1'],
      expected: { method: 'getPricingQuoteTemplate', pricingQuoteTemplateId: 'template-1' },
    },
    {
      argv: ['pricing-quotations'],
      expected: { method: 'listPricingQuotations' },
    },
    {
      argv: ['pricing-quotation', '--pricing-quotation-id', 'quotation-1'],
      expected: { method: 'getPricingQuotation', pricingQuotationId: 'quotation-1' },
    },
    {
      argv: ['pricing-explanations'],
      expected: { method: 'listPricingExplanations' },
    },
    {
      argv: ['pricing-explanation', '--pricing-explanation-id', 'explanation-1'],
      expected: { method: 'getPricingExplanation', pricingExplanationId: 'explanation-1' },
    },
    {
      argv: ['file-resources'],
      expected: { method: 'listFileResources' },
    },
    {
      argv: ['file-resource', '--file-resource-id', 'file-1'],
      expected: { method: 'getFileResource', fileResourceId: 'file-1' },
    },
    {
      argv: ['target-attachment-bindings', '--target-ref', 'target://listing/1'],
      expected: { method: 'listTargetAttachmentBindings', targetRef: 'target://listing/1' },
    },
  ] as const;

  for (const { argv, expected } of cases) {
    const printed: unknown[] = [];

    const exitCode = await runCli([...argv], {
      createClient: () => {
        clientCreateCalls.push(argv);
        return truthFetchClient as never;
      },
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('truth-fetch dispatch should not print help');
      },
    });

    assert.equal(exitCode, 0);
    assert.deepEqual(printed, [expected]);
  }

  assert.equal(clientCreateCalls.length, cases.length);
});

test('runCli default client uses tenant env context for expanded truth-fetch reads', async () => {
  const printed: unknown[] = [];
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const restoreEnv = [
    setEnvVar('BIDVIA_BASE_URL', 'http://127.0.0.1:8787'),
    setEnvVar('BIDVIA_TENANT_ID', 'tenant-a'),
  ];
  const previousFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });

    return new Response(JSON.stringify({ ok: true, path: String(input) }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const fileResourceExitCode = await runCli(['file-resource', '--file-resource-id', 'file-1'], {
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('truth-fetch reads should not print help');
      },
    });

    const targetBindingsExitCode = await runCli([
      'target-attachment-bindings',
      '--target-ref',
      'target://listing/1',
    ], {
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('truth-fetch reads should not print help');
      },
    });

    assert.equal(fileResourceExitCode, 0);
    assert.equal(targetBindingsExitCode, 0);
  } finally {
    globalThis.fetch = previousFetch;
    for (const restore of restoreEnv.reverse()) {
      restore();
    }
  }

  assert.equal(calls.length, 2);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/file-resources/file-1');
  assert.equal(
    String(calls[1]?.input),
    'http://127.0.0.1:8787/runtime/targets/target%3A%2F%2Flisting%2F1/attachment-bindings',
  );
  assert.deepEqual(printed, [
    { ok: true, path: 'http://127.0.0.1:8787/runtime/file-resources/file-1' },
    {
      ok: true,
      path: 'http://127.0.0.1:8787/runtime/targets/target%3A%2F%2Flisting%2F1/attachment-bindings',
    },
  ]);
});
