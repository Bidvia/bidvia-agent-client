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

test('validate-contract covers the shipped bounded membership lifecycle and dispatch-authority support alongside existing identity-session prerequisite validation', () => {
  const validator = readText('scripts/validate-contract.ts');

  assert.match(validator, /createAccountMembershipInvitation/);
  assert.match(validator, /acceptAccountMembershipInvitation/);
  assert.match(validator, /transferAccountMembershipAdmin/);
  assert.match(validator, /removeAccountMembership/);
  assert.match(validator, /getAccountAgentDispatchAuthority/);
  assert.match(validator, /createAccountAgentDispatchAuthorityRequest/);
});
