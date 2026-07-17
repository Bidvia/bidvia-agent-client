import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');

function readText(relativePath: string) {
  return readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

test('public docs do not depend on removed internal planning and handoff artifacts', () => {
  const readme = readText('README.md');
  const onboarding = readText('docs/ONBOARDING.md');
  const validationLanes = readText('docs/VALIDATION_LANES.md');
  const contractBoundary = readText('docs/CONTRACT_BOUNDARY.md');
  const roadmap = readText('docs/ROADMAP.md');
  const openClawOnboarding = readText('docs/OPENCLAW_GATEWAY_ONBOARDING.md');
  const openClawSmoke = readText('docs/OPENCLAW_GATEWAY_SMOKE.md');

  const deletedInternalReferences = [
    /docs\/superpowers\//i,
    /INTERNAL_RELEASE_CHECKLIST/i,
    /WEBSITE_FIRST_ACCESS_HANDOFF/i,
    /CLIENT_TEAM_TAKEOVER/i,
    /OPTIMIZATION_BACKLOG/i,
    /REPOSITORY_STRUCTURE_PROPOSAL/i,
    /CORE_FEEDBACK_2026/i,
    /RELEASE_NOTES_LOCAL_ONLY_NEXT_VERSION/i,
    /PRODUCT_POSITIONING/i,
  ];

  for (const document of [readme, onboarding, validationLanes, contractBoundary, roadmap, openClawOnboarding, openClawSmoke]) {
    for (const pattern of deletedInternalReferences) {
      assert.doesNotMatch(document, pattern);
    }
  }
});

test('public docs keep customer-facing install and validation guidance', () => {
  const readme = readText('README.md');
  const onboarding = readText('docs/ONBOARDING.md');
  const validationLanes = readText('docs/VALIDATION_LANES.md');

  assert.match(readme, /npm install @bidvia\/client/);
  assert.match(readme, /bidvia mcp-server/);
  assert.match(readme, /bidvia install-integrity/);
  assert.match(readme, /bidvia validation-smoke/);
  assert.match(readme, /bidvia diagnostic-bundle-export/);
  assert.match(readme, /bidvia public-runtime-interpretation-probe/);

  assert.match(onboarding, /bidvia onboard/);
  assert.match(onboarding, /bidvia sign-in/);
  assert.match(onboarding, /bidvia create-provisional-agent/);
  assert.match(onboarding, /bidvia route-context-matrix/);

  assert.match(validationLanes, /default local docker/i);
  assert.match(validationLanes, /proof-lane/i);
  assert.match(validationLanes, /runtime-generated objects/i);
  assert.match(validationLanes, /bounded task closure, not full business closure/i);
});

test('removed internal-only docs are no longer present in the public repo tree', () => {
  const deletedPaths = [
    'docs/INTERNAL_RELEASE_CHECKLIST.md',
    'docs/CLIENT_TEAM_TAKEOVER.md',
    'docs/WEBSITE_FIRST_ACCESS_HANDOFF.md',
    'docs/OPTIMIZATION_BACKLOG.md',
    'docs/REPOSITORY_STRUCTURE_PROPOSAL.md',
    'docs/CORE_FEEDBACK_2026-04-30_LOCAL_DOCKER_CLOSURE.md',
    'docs/CORE_FEEDBACK_2026-05-06_LOCAL_DOCKER_DEEP_INTEGRATION_REPORT.md',
    'docs/CORE_FEEDBACK_2026-05-16_CONCURRENT_BOOTSTRAP_AND_CONNECTOR_BOUNDARY.md',
    'docs/RELEASE_NOTES_LOCAL_ONLY_NEXT_VERSION.md',
    'docs/PRODUCT_POSITIONING.md',
  ];

  for (const relativePath of deletedPaths) {
    assert.equal(existsSync(path.join(workspaceRoot, relativePath)), false, `${relativePath} should not remain in the public repo`);
  }
});
