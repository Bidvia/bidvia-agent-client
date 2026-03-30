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

test('runCli help lists truth-fetch read-only commands under the visibility group', async () => {
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
  const expectedVisibilityLines = [
    'bidvia-agent-client',
    'Visibility commands:',
    '  environment-mode',
    '  runtime-capabilities',
    '  launch-topology-smoke',
    '  server-capabilities',
    '  operator-discovery',
    '  account-agents',
    '  account-agent --registration-id ...',
    '  account-agent-bindings',
    '  account-records',
    '  agent-presence --registration-id ...',
    '  agent-authority --registration-id ...',
    '  agent-readiness --registration-id ...',
    '  agent-summary --registration-id ...',
    '  agent-authority-profile --registration-id ...',
    '  agent-authority-ladder --registration-id ...',
    '  agent-capability-profiles --registration-id ...',
    '  agent-capability-profile --registration-id ... --capability-profile-id ...',
    '  canonical-semantic-concepts',
    '  canonical-semantic-concept --concept-id ...',
    '  canonical-semantic-labels',
    '  canonical-semantic-label --label-id ...',
    '  canonical-semantic-mappings',
    '  canonical-semantic-mapping --mapping-id ...',
    '  canonical-semantic-taxonomy-entries',
    '  canonical-semantic-taxonomy-entry --taxonomy-entry-id ...',
    '  canonical-semantic-lineage-links',
    '  canonical-semantic-lineage-link --lineage-link-id ...',
    '  pricing-bases',
    '  pricing-basis --pricing-basis-id ...',
    '  pricing-rule-atoms',
    '  pricing-rule-atom --pricing-rule-atom-id ...',
    '  pricing-quotation-method-modules',
    '  pricing-quotation-method-module --pricing-quotation-method-module-id ...',
    '  pricing-quote-templates',
    '  pricing-quote-template --pricing-quote-template-id ...',
    '  pricing-quotations',
    '  pricing-quotation --pricing-quotation-id ...',
    '  pricing-explanations',
    '  pricing-explanation --pricing-explanation-id ...',
    '  document-artifacts',
    '  document-artifact --document-artifact-id ...',
    '  media-assets',
    '  media-asset --media-asset-id ...',
    '  evidence-assets',
    '  evidence-asset --evidence-asset-id ...',
    '  attachment-bindings',
    '  attachment-binding --attachment-binding-id ...',
    '  file-resources',
    '  file-resource --file-resource-id ...',
    '  target-attachment-bindings --target-ref ...',
  ];
  assert.deepEqual(lines.slice(0, expectedVisibilityLines.length), expectedVisibilityLines);
  assert.equal(lines[expectedVisibilityLines.length], 'Execution commands:');
});

test('runCli returns structured missing required-id failures for truth-fetch detail commands', async () => {
  const cases = [
    ['account-agent', '--registration-id'],
    ['agent-presence', '--registration-id'],
    ['agent-authority', '--registration-id'],
    ['canonical-semantic-concept', '--concept-id'],
    ['pricing-basis', '--pricing-basis-id'],
    ['document-artifact', '--document-artifact-id'],
    ['media-asset', '--media-asset-id'],
    ['evidence-asset', '--evidence-asset-id'],
    ['attachment-binding', '--attachment-binding-id'],
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

test('runCli returns a structured missing value failure when a required truth-fetch id flag has no value', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['account-agent', '--registration-id'], {
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('missing value failures should not print help');
    },
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(printed, [{
    error: {
      code: 'invalid-input',
      command: 'account-agent',
      message: 'Missing value for --registration-id on account-agent.',
      details: ['--registration-id'],
    },
  }]);
});

test('runCli returns structured unknown option failures for unsupported truth-fetch flags', async () => {
  const printed: unknown[] = [];

  const exitCode = await runCli(['account-agents', '--registration-id', 'areg-1'], {
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('unknown option failures should not print help');
    },
  });

  assert.equal(exitCode, 1);
  assert.deepEqual(printed, [{
    error: {
      code: 'invalid-input',
      command: 'account-agents',
      message: 'Unknown option(s): --registration-id. Run --help to review supported commands and flags.',
      details: ['--registration-id'],
    },
  }]);
});

test('runCli routes truth-fetch commands through the matching SDK method and prints JSON results', async () => {
  const clientCreateCalls: unknown[] = [];
  const truthFetchClient = {
    async listAccountAgents() {
      return { method: 'listAccountAgents' };
    },
    async getAccountAgent(registrationId: string) {
      return { method: 'getAccountAgent', registrationId };
    },
    async listAccountAgentBindings() {
      return { method: 'listAccountAgentBindings' };
    },
    async listAccountRecords() {
      return { method: 'listAccountRecords' };
    },
    async getAgentPresence(registrationId: string) {
      return { method: 'getAgentPresence', registrationId };
    },
    async getAgentAuthority(registrationId: string) {
      return { method: 'getAgentAuthority', registrationId };
    },
    async listCanonicalSemanticConcepts() {
      return { method: 'listCanonicalSemanticConcepts' };
    },
    async getCanonicalSemanticConcept(conceptId: string) {
      return { method: 'getCanonicalSemanticConcept', conceptId };
    },
    async listPricingBases() {
      return { method: 'listPricingBases' };
    },
    async getPricingBasis(pricingBasisId: string) {
      return { method: 'getPricingBasis', pricingBasisId };
    },
    async listDocumentArtifacts() {
      return { method: 'listDocumentArtifacts' };
    },
    async getDocumentArtifact(documentArtifactId: string) {
      return { method: 'getDocumentArtifact', documentArtifactId };
    },
    async listMediaAssets() {
      return { method: 'listMediaAssets' };
    },
    async getMediaAsset(mediaAssetId: string) {
      return { method: 'getMediaAsset', mediaAssetId };
    },
    async listEvidenceAssets() {
      return { method: 'listEvidenceAssets' };
    },
    async getEvidenceAsset(evidenceAssetId: string) {
      return { method: 'getEvidenceAsset', evidenceAssetId };
    },
    async listAttachmentBindings() {
      return { method: 'listAttachmentBindings' };
    },
    async getAttachmentBinding(attachmentBindingId: string) {
      return { method: 'getAttachmentBinding', attachmentBindingId };
    },
  };

  const cases = [
    {
      argv: ['account-agents'],
      expected: { method: 'listAccountAgents' },
    },
    {
      argv: ['account-agent', '--registration-id', 'areg-1'],
      expected: { method: 'getAccountAgent', registrationId: 'areg-1' },
    },
    {
      argv: ['account-agent-bindings'],
      expected: { method: 'listAccountAgentBindings' },
    },
    {
      argv: ['account-records'],
      expected: { method: 'listAccountRecords' },
    },
    {
      argv: ['agent-presence', '--registration-id', 'areg-2'],
      expected: { method: 'getAgentPresence', registrationId: 'areg-2' },
    },
    {
      argv: ['agent-authority', '--registration-id', 'areg-3'],
      expected: { method: 'getAgentAuthority', registrationId: 'areg-3' },
    },
    {
      argv: ['canonical-semantic-concepts'],
      expected: { method: 'listCanonicalSemanticConcepts' },
    },
    {
      argv: ['canonical-semantic-concept', '--concept-id', 'concept-1'],
      expected: { method: 'getCanonicalSemanticConcept', conceptId: 'concept-1' },
    },
    {
      argv: ['pricing-bases'],
      expected: { method: 'listPricingBases' },
    },
    {
      argv: ['pricing-basis', '--pricing-basis-id', 'pricing-1'],
      expected: { method: 'getPricingBasis', pricingBasisId: 'pricing-1' },
    },
    {
      argv: ['document-artifacts'],
      expected: { method: 'listDocumentArtifacts' },
    },
    {
      argv: ['document-artifact', '--document-artifact-id', 'document-1'],
      expected: { method: 'getDocumentArtifact', documentArtifactId: 'document-1' },
    },
    {
      argv: ['media-assets'],
      expected: { method: 'listMediaAssets' },
    },
    {
      argv: ['media-asset', '--media-asset-id', 'media-1'],
      expected: { method: 'getMediaAsset', mediaAssetId: 'media-1' },
    },
    {
      argv: ['evidence-assets'],
      expected: { method: 'listEvidenceAssets' },
    },
    {
      argv: ['evidence-asset', '--evidence-asset-id', 'evidence-1'],
      expected: { method: 'getEvidenceAsset', evidenceAssetId: 'evidence-1' },
    },
    {
      argv: ['attachment-bindings'],
      expected: { method: 'listAttachmentBindings' },
    },
    {
      argv: ['attachment-binding', '--attachment-binding-id', 'attachment-1'],
      expected: { method: 'getAttachmentBinding', attachmentBindingId: 'attachment-1' },
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

test('runCli default client uses session and admin-session env context for corrected truth-fetch reads', async () => {
  const printed: unknown[] = [];
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const restoreEnv = [
    setEnvVar('BIDVIA_BASE_URL', 'http://127.0.0.1:8787'),
    setEnvVar('BIDVIA_TENANT_ID', 'tenant-a'),
    setEnvVar('BIDVIA_SESSION_ID', 'sess-1'),
    setEnvVar('BIDVIA_ADMIN_SESSION_ID', 'admin-sess-1'),
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
    const accountExitCode = await runCli(['account-agents'], {
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('truth-fetch reads should not print help');
      },
    });

    const presenceExitCode = await runCli(['agent-presence', '--registration-id', 'areg-1'], {
      printJson: (value) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('truth-fetch reads should not print help');
      },
    });

    assert.equal(accountExitCode, 0);
    assert.equal(presenceExitCode, 0);
  } finally {
    globalThis.fetch = previousFetch;
    for (const restore of restoreEnv.reverse()) {
      restore();
    }
  }

  assert.equal(calls.length, 2);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/presence?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
  assert.deepEqual(printed, [
    { ok: true, path: 'http://127.0.0.1:8787/runtime/account/agents' },
    { ok: true, path: 'http://127.0.0.1:8787/runtime/agents/areg-1/presence?tenant_id=tenant-a' },
  ]);
});
