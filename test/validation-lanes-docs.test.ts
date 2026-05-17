import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');

function readText(relativePath: string) {
  return readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

const progressionChain = 'self-service patch -> dispatch-authority request -> operator/admin review closure -> external binding check -> post-step verification of task-write-ready and dispatch-eligibility truth';
const actorOwnership = 'The external claimed agent owns the self-service patch and bounded dispatch-authority request, operator/admin owns review closure';
const bindingHelper = 'first-class account-plane external binding write helper';
const failClosed = 'fail-closed';
const requiredTaskWriteReadyDocs = [
  'README.md',
  'docs/ONBOARDING.md',
  'docs/VALIDATION_LANES.md',
  'docs/ROADMAP.md',
] as const;

function assertTaskWriteReadyProgressionSemantics(text: string, label: string) {
  assert.match(text, new RegExp(progressionChain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${label} must keep the full task-write-ready progression chain in order.`);
  assert.match(text, new RegExp(actorOwnership.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${label} must state who owns the external-agent and operator/admin steps.`);
  assert.match(text, /external binding/i, `${label} must keep the external binding step explicit.`);
  assert.match(text, new RegExp(bindingHelper.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), `${label} must surface the shipped external binding write helper.`);
  assert.match(text, /different body contracts/i, `${label} must explain claimant and operator binding bodies diverge.`);
  assert.match(text, /Core/i, `${label} must keep the missing completion path Core-owned.`);
  assert.match(text, new RegExp(failClosed, 'i'), `${label} must keep the progression fail-closed.`);
  assert.match(text, /bounded task closure, not full business closure/i, `${label} must distinguish bounded task closure from full business closure.`);
  assert.doesNotMatch(text, /does not yet ship a first-class binding-completion helper/i, `${label} must not claim the binding helper is unshipped.`);
}

test('client docs distinguish local validation lanes and task-write-ready guidance boundaries', () => {
  const readmePath = requiredTaskWriteReadyDocs[0];
  const onboardingPath = requiredTaskWriteReadyDocs[1];
  const validationLanesPath = requiredTaskWriteReadyDocs[2];
  const roadmapPath = requiredTaskWriteReadyDocs[3];

  const readme = readText(readmePath);
  const onboarding = readText(onboardingPath);
  const validationLanes = readText(validationLanesPath);
  const roadmap = readText(roadmapPath);

  assert.match(validationLanes, /default local docker/i);
  assert.match(validationLanes, /proof-lane/i);
  assert.match(validationLanes, /admin-session/i);
  assert.match(validationLanes, /runtime-generated objects/i);
  assert.match(validationLanes, /task-write-ready progression is a distinct surfaced path/i);
  assert.match(validationLanes, /not an implied side effect of claim/i);
  assert.match(validationLanes, /executable, review-safe, and compatibility-only/i);

  assertTaskWriteReadyProgressionSemantics(readme, readmePath);
  assertTaskWriteReadyProgressionSemantics(onboarding, onboardingPath);
  assertTaskWriteReadyProgressionSemantics(validationLanes, validationLanesPath);
  assertTaskWriteReadyProgressionSemantics(roadmap, roadmapPath);

  assert.match(readme, /dispatch-authority request/i, `${readmePath} must keep the dispatch-authority step explicit.`);
  assert.match(readme, /operator\/admin review closure/i, `${readmePath} must keep operator\/admin review closure explicit.`);
  assert.match(readme, /external binding check/i, `${readmePath} must keep the external binding step explicit and ordered.`);

  assert.match(onboarding, /dispatch-authority request/i, `${onboardingPath} must keep the dispatch-authority step explicit.`);
  assert.match(onboarding, /operator\/admin review closure/i, `${onboardingPath} must keep operator\/admin review closure explicit.`);
  assert.match(onboarding, /external binding check/i, `${onboardingPath} must keep the external binding step explicit and ordered.`);

  assert.match(validationLanes, /dispatch-authority request/i, `${validationLanesPath} must keep the dispatch-authority step explicit.`);
  assert.match(validationLanes, /operator\/admin review closure/i, `${validationLanesPath} must keep operator\/admin review closure explicit.`);
  assert.match(validationLanes, /external binding check/i, `${validationLanesPath} must keep the external binding step explicit and ordered.`);

  assert.match(roadmap, /dispatch-authority request/i, `${roadmapPath} must keep the dispatch-authority step explicit.`);
  assert.match(roadmap, /operator\/admin review closure/i, `${roadmapPath} must keep operator\/admin review closure explicit.`);
  assert.match(roadmap, /external binding check/i, `${roadmapPath} must keep the external binding step explicit and ordered.`);

  assert.match(onboarding, /default local docker/i);
  assert.match(onboarding, /proof-lane/i);
  assert.match(onboarding, /admin-session/i);
  assert.match(onboarding, /seeded/i);
  assert.match(onboarding, /runtime-generated object/i);
  assert.match(onboarding, /fixed proof ids are not assumed/i);
  assert.match(onboarding, /where admin\/operator context is required/i);

  assert.match(roadmap, /validation lane/i);
  assert.match(roadmap, /proof-lane/i);
  assert.match(roadmap, /task-write-ready/i);
  assert.match(readme, /install-integrity/i);
  assert.match(readme, /validation-smoke/i);
  assert.match(readme, /diagnostic-bundle-export/i);
  assert.match(readme, /public-runtime-interpretation-probe/i);
  assert.match(onboarding, /install-integrity/i);
  assert.match(onboarding, /validation-smoke/i);
  assert.match(onboarding, /public-runtime-interpretation-probe/i);
  assert.match(validationLanes, /validation-smoke/i);
  assert.match(validationLanes, /diagnostic-bundle-export/i);
  assert.match(validationLanes, /public-runtime-interpretation-probe/i);
  assert.match(roadmap, /install-integrity/i);
  assert.match(roadmap, /validation-smoke/i);
  assert.match(roadmap, /public-runtime-interpretation-probe/i);
});
