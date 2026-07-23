import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import {
  chmod,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import {
  TASK10_AUTHORITY,
  TASK10_CONTENT_FILES,
  TASK10_NON_CLAIMS,
  TASK10_PROHIBITED_VALUE_FAMILIES,
  TASK10_REQUIRED_SCENARIO_FAMILIES,
  buildTask10PackageName,
  parseTask10PublicationReceiptWire,
  parseTask10SecretReviewWire,
} from '../scripts/task10/contracts.ts';
import {
  EMPTY_TASK10_PROHIBITED_VALUE_CATALOG,
  assessCandidatePublication,
  assembleCandidatePayload,
  createDefaultTask10ArchiveDependencies,
  discardTask10Publication,
  freezeTask10Publication,
  isTask10TarAvailable,
  materializeTask10Publication,
  validateOfflinePublication,
  validateProducerPublication,
  type Task10ArchiveDependencies,
  type Task10ArchiveMember,
  type Task10MaterializePublicationInput,
  type Task10PrivateSourceMap,
  type Task10ProhibitedValueCatalog,
  type Task10PublicationDecision,
} from '../scripts/task10/publication.ts';

const RUN_STARTED_AT = '2026-07-19T01:02:03.000Z';
const GENERATED_AT = '2026-07-19T01:05:00.000Z';
const EXPECTED_PACKAGE_NAME = buildTask10PackageName(RUN_STARTED_AT);
const PUBLICATION_ROOT_BASENAME = 'provider-proof-terminal-client-validation-artifacts';
const WORKTREE_ROOT = fileURLToPath(new URL('..', import.meta.url));
const THIS_PUBLICATION_TEST_PATH = 'test/task10-publication.test.ts';
const IMMUTABLE_ATTEMPT_002_PACKAGE_NAME = 'client-task10-reproducibility-attempt-2026-07-18-task10-postmerge-002-20260720T030347Z';
const IMMUTABLE_ATTEMPT_002_RELATIVE_DIRECTORY = `provider-proof-terminal-client-validation-artifacts/${IMMUTABLE_ATTEMPT_002_PACKAGE_NAME}`;
const IMMUTABLE_ATTEMPT_002_RELATIVE_ARCHIVE = `${IMMUTABLE_ATTEMPT_002_RELATIVE_DIRECTORY}.tar.gz`;
const IMMUTABLE_ATTEMPT_002_RELATIVE_RECEIPT = `${IMMUTABLE_ATTEMPT_002_RELATIVE_DIRECTORY}.publication.json`;
const IMMUTABLE_ATTEMPT_007_RELATIVE_ARCHIVE = 'provider-proof-terminal-client-validation-artifacts/client-task10-reproducibility-attempt-2026-07-20-task10-postmerge-007-20260722T060902Z.tar.gz';
const ATTEMPT_002_SHORT_CORE_SHA = '97e2fbe';
const ATTEMPT_002_FULL_CORE_SHA = '97e2fbe3934ea821daf654afa0adaef2c3e16077';
const ATTEMPT_002_SHORT_EVIDENCE_SHA = '8d2692f';
const ATTEMPT_002_FULL_EVIDENCE_SHA = '8d2692fea8a450225717c067628bbc0b372c7536';
const ADAPTER_ALLOWED_COMPATIBILITY_GRAPH_LINE = '  \'core:97e2fbe3934ea821daf654afa0adaef2c3e16077:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093\',';
const SELF_ADAPTER_COMPATIBILITY_GRAPH_DECLARATION_LINE = `  const adapterCompatibilityGraphLine = ${JSON.stringify(ADAPTER_ALLOWED_COMPATIBILITY_GRAPH_LINE)};`;
const IMMUTABLE_ATTEMPT_002_APPROVED_ARCHIVE_SHA256 = '3a6e8da1925bf8d3a2d9711d33edbf0cf0fd581c749c47c3299ace1f09a95aae';
const IMMUTABLE_ATTEMPT_002_APPROVED_RECEIPT_SHA256 = '8f7479a890b86aa502ef231baffa0337cf55f416cc785f49514e193bba402cb6';
const IMMUTABLE_ATTEMPT_002_APPROVED_PACKAGE_HASHES = Object.freeze({
  'README.md': '865bb59b6cf126d3a959bd85e05c60d4d7fb52f0c64ea8856e4a22b29e700cc4',
  'SHA256SUMS.txt': '4c3ceadd47c26a7bd52ff6feca4681a20c69796a470fcaa28309fb9d610b8591',
  'client-conclusion.json': '605d9b0c1409451b3ce7b27a361b29e22c4a06f8644a0b2a75bf09e9a10fe112',
  'client-fingerprint.json': 'b67609ff012b10cc7973e14990e834ba53b111f4844f38d26a5b00f60d5dabc4',
  'command-log.json': '5ccdb3b5765b1f18373bfc51a43f389e6956ce0f4fbcd588686bef0cdbc9f351',
  'scenario-matrix.json': 'e2af499f3dec35a1c395e778aa87da3bac4bc55ba596291e4f126efc89d002bd',
  'secret-review.json': '1c788a24e3bae0b3e9456aedb5dbe6345dc569e449836c96ac039128c7d39200',
});
const IMMUTABLE_ATTEMPT_002_APPROVED_MANIFEST_HASHES = Object.freeze({
  'README.md': '865bb59b6cf126d3a959bd85e05c60d4d7fb52f0c64ea8856e4a22b29e700cc4',
  'client-conclusion.json': '605d9b0c1409451b3ce7b27a361b29e22c4a06f8644a0b2a75bf09e9a10fe112',
  'client-fingerprint.json': 'b67609ff012b10cc7973e14990e834ba53b111f4844f38d26a5b00f60d5dabc4',
  'command-log.json': '5ccdb3b5765b1f18373bfc51a43f389e6956ce0f4fbcd588686bef0cdbc9f351',
  'scenario-matrix.json': 'e2af499f3dec35a1c395e778aa87da3bac4bc55ba596291e4f126efc89d002bd',
  'secret-review.json': '1c788a24e3bae0b3e9456aedb5dbe6345dc569e449836c96ac039128c7d39200',
});
const ATTEMPT_002_HISTORICAL_LITERALS = Object.freeze([
  'attempt-2026-07-18-task10-postmerge-002',
  ATTEMPT_002_FULL_CORE_SHA,
  ATTEMPT_002_SHORT_CORE_SHA,
  ATTEMPT_002_FULL_EVIDENCE_SHA,
  ATTEMPT_002_SHORT_EVIDENCE_SHA,
  'task10-runtime-97e2fbe',
  'task10-bootstrap-97e2fbe',
  'task10-scenario-97e2fbe',
  '58925',
  '58926',
  '58927',
  '58928',
  'bidvia-task10-attempt-2026-07-18-task10-postmerge-002',
  'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-runtime',
  'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-postgres',
  'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-fixture',
  'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-operator',
]);
const PACKAGE_MEMBER_NAMES = [
  'README.md',
  'SHA256SUMS.txt',
  'client-conclusion.json',
  'client-fingerprint.json',
  'command-log.json',
  'scenario-matrix.json',
  'secret-review.json',
];

type PrivateSourceSeed = {
  sourceClass: 'preflight' | 'runtime' | 'reset' | 'success-001' | 'recovery-001' | 'success-002-reuse';
  bytes: Uint8Array;
};

function digestHex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lineContainsHistoricalLiteral(lineText: string, literal: string): boolean {
  if (/^[0-9a-f]+$/u.test(literal)) {
    return new RegExp(`(^|[^0-9a-f])${escapeRegex(literal)}(?=$|[^0-9a-f])`, 'u').test(lineText);
  }
  return lineText.includes(literal);
}

function extractRequiredTextFromRuleDefinitionLine(lineText: string): string | null {
  const match = lineText.match(/requiredText: (?:(?:'((?:\\.|[^'])*)')|(?:"((?:\\.|[^"])*)"))/u);
  return match?.[1] ?? match?.[2] ?? null;
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf8', { fatal: true }).decode(bytes);
}

function isBinaryContent(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) {
    return true;
  }
  try {
    decodeUtf8(bytes);
    return false;
  } catch {
    return true;
  }
}

function listTrackedPathsFromGit(rootPath: string): readonly string[] {
  const result = spawnSync('git', ['ls-files', '-z'], {
    cwd: rootPath,
    env: {
      ...process.env,
      GIT_MASTER: '1',
    },
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.split('\0').filter(Boolean);
}

const EXPLICIT_BINARY_TRACKED_PATHS = new Set<string>([
  'provider-proof-terminal-client-validation-artifacts/client-commercial-universe-4dfcf03-20260716T083123Z.tar.gz',
  'provider-proof-terminal-client-validation-artifacts/client-commercial-universe-4dfcf03-20260717T012357Z.tar.gz',
  'provider-proof-terminal-client-validation-artifacts/client-commercial-universe-917d18c-20260716T074615Z.tar.gz',
  IMMUTABLE_ATTEMPT_002_RELATIVE_ARCHIVE,
  IMMUTABLE_ATTEMPT_007_RELATIVE_ARCHIVE,
]);

// TASK10_SELF_ALLOW_BLOCK_START
const SELF_ALLOWED_EXACT_LINES = new Set<string>([
  "const IMMUTABLE_ATTEMPT_002_PACKAGE_NAME = 'client-task10-reproducibility-attempt-2026-07-18-task10-postmerge-002-20260720T030347Z';",
  "const ATTEMPT_002_SHORT_CORE_SHA = '97e2fbe';",
  "const ATTEMPT_002_FULL_CORE_SHA = '97e2fbe3934ea821daf654afa0adaef2c3e16077';",
  "const ATTEMPT_002_SHORT_EVIDENCE_SHA = '8d2692f';",
  "const ATTEMPT_002_FULL_EVIDENCE_SHA = '8d2692fea8a450225717c067628bbc0b372c7536';",
  "const ADAPTER_ALLOWED_COMPATIBILITY_GRAPH_LINE = '  \'core:97e2fbe3934ea821daf654afa0adaef2c3e16077:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093\',';",
  "  'attempt-2026-07-18-task10-postmerge-002',",
  "  'task10-runtime-97e2fbe',",
  "  'task10-bootstrap-97e2fbe',",
  "  'task10-scenario-97e2fbe',",
  "  '58925',",
  "  '58926',",
  "  '58927',",
  "  '58928',",
  "  'bidvia-task10-attempt-2026-07-18-task10-postmerge-002',",
  "  'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-runtime',",
  "  'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-postgres',",
  "  'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-fixture',",
  "  'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-operator',",
  "    lineText: 'The migration must search every Task 10 code, test, and runbook file for `attempt-2026-07-18-task10-postmerge-002`, `97e2fbe`, `8d2692f`, old markers, ports, Compose/network/container names, bundle/preflight paths, and old authority URLs. Every active tooling reference moves to attempt 007. The only allowed old-attempt references are the preserved package bytes and explicit historical/non-supersession assertions.',",
  "    lineText: 'ACTIVE: The migration must search every Task 10 code, test, and runbook file for `attempt-2026-07-18-task10-postmerge-002`, `97e2fbe`, `8d2692f`, old markers, ports, Compose/network/container names, bundle/preflight paths, and old authority URLs. Every active tooling reference moves to attempt 007. The only allowed old-attempt references are the preserved package bytes and explicit historical/non-supersession assertions.',",
  "    lineText: '- Core SHA: `97e2fbe3934ea821daf654afa0adaef2c3e16077`',",
  "    lineText: '- Attempt id: `attempt-2026-07-18-task10-postmerge-002` 8d2692f',",
  '  const adapterCompatibilityGraphLine = ADAPTER_ALLOWED_COMPATIBILITY_GRAPH_LINE;',
  '    lineText: `${adapterCompatibilityGraphLine} attempt-2026-07-18-task10-postmerge-002`,',
  '    lineText: `${adapterCompatibilityGraphLine} 97e2fbe`,',
  '    lineText: `${adapterCompatibilityGraphLine} task10-runtime-97e2fbe`,',
  '    lineText: `${adapterCompatibilityGraphLine} 58925`,',
  "    && match.literal === '97e2fbe'",
  "    && match.literal === '8d2692f'",
  "    && match.lineText.includes('`97e2fbe`, `8d2692f`')), true);",
  "    await writeFile(scriptPath, 'attempt-2026-07-18-task10-postmerge-002\\n', 'utf8');",
  "    await writeFile(yamlPath, 'core_sha: 97e2fbe\\n', 'utf8');",
  "    await writeFile(extensionlessPath, 'evidence_sha: 8d2692f\\n', 'utf8');",
  "    assert.equal(scan.matches.some((match) => match.relativePath === 'scan-fixture.sh' && match.literal === 'attempt-2026-07-18-task10-postmerge-002'), true);",
  "    assert.equal(scan.matches.some((match) => match.relativePath === 'scan-fixture.yaml' && match.literal === '97e2fbe'), true);",
  "    assert.equal(scan.matches.some((match) => match.relativePath === 'scan-fixture' && match.literal === '8d2692f'), true);",
  '  const adapterCompatibilityGraphLine = ADAPTER_ALLOWED_COMPATIBILITY_GRAPH_LINE;',
  "    await writeFile(shortLinePath, 'markers: 97e2fbe 8d2692f\\n', 'utf8');",
  '  const adapterCompatibilityGraphLine = ADAPTER_ALLOWED_COMPATIBILITY_GRAPH_LINE;',
  "    literal: 'attempt-2026-07-18-task10-postmerge-002',",
  "    lineText: '- Attempt id: `attempt-2026-07-18-task10-postmerge-002`',",
  "    lineText: 'active stale attempt-2026-07-18-task10-postmerge-002 should not be allowed here',",
  "    literal: '97e2fbe',",
  "    literal: '8d2692f',",
  "  const adapterCompatibilityGraphLine = '  \'core:97e2fbe3934ea821daf654afa0adaef2c3e16077:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093\',';",
  "    literal: 'task10-runtime-97e2fbe',",
  "    literal: '58925',",
  "  const adapterCompatibilityGraphLine = '  \'core:97e2fbe3934ea821daf654afa0adaef2c3e16077:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093\',';",
  "  const adapterCompatibilityGraphLine = '  \'core:97e2fbe3934ea821daf654afa0adaef2c3e16077:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093\',';",
  "  const adapterCompatibilityGraphLine = '  \'core:97e2fbe3934ea821daf654afa0adaef2c3e16077:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093\',';",
]);
// TASK10_SELF_ALLOW_BLOCK_END

const SELF_ALLOW_BLOCK_START_MARKER = '// TASK10_SELF_ALLOW_BLOCK_START';
const SELF_ALLOW_BLOCK_END_MARKER = '// TASK10_SELF_ALLOW_BLOCK_END';
const SELF_ALLOW_ADAPTER_TEST_START_MARKER = '// TASK10_SELF_ALLOW_ADAPTER_TEST_START';
const SELF_ALLOW_ADAPTER_TEST_END_MARKER = '// TASK10_SELF_ALLOW_ADAPTER_TEST_END';

function computeSelfAllowedExactBlockRanges(): ReadonlyArray<Readonly<{ startLine: number; endLine: number }>> {
  const sourceLines = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
  const ranges: Array<{ startLine: number; endLine: number }> = [];
  let openLine: number | null = null;
  for (let index = 0; index < sourceLines.length; index += 1) {
    const line = sourceLines[index] ?? '';
    if (line === SELF_ALLOW_BLOCK_START_MARKER || line === SELF_ALLOW_ADAPTER_TEST_START_MARKER) {
      openLine = index + 1;
      continue;
    }
    if (line === SELF_ALLOW_BLOCK_END_MARKER || line === SELF_ALLOW_ADAPTER_TEST_END_MARKER) {
      if (openLine === null) {
        throw new Error('task10 self-allow marker end encountered before start');
      }
      ranges.push({ startLine: openLine, endLine: index + 1 });
      openLine = null;
    }
  }
  if (openLine !== null) {
    throw new Error('task10 self-allow marker start missing end');
  }
  return Object.freeze(ranges.map((range) => Object.freeze(range)));
}

const SELF_ALLOWED_EXACT_BLOCK_RANGES = computeSelfAllowedExactBlockRanges();

function ruleMatchesHistoricalLiteral(match: HistoricalLiteralMatch, rule: HistoricalLiteralContextRule): boolean {
  if (rule.path !== match.relativePath) {
    return false;
  }
  if (rule.exactLineText !== undefined) {
    return match.lineText === rule.exactLineText && lineContainsHistoricalLiteral(rule.exactLineText, match.literal);
  }
  if (rule.exactRuleText !== undefined) {
    return match.lineText === rule.exactRuleText && lineContainsHistoricalLiteral(rule.exactRuleText, match.literal);
  }
  if ((rule as { requiredText?: string }).requiredText !== undefined) {
    const requiredText = (rule as { requiredText?: string }).requiredText!;
    return match.lineText === requiredText && lineContainsHistoricalLiteral(requiredText, match.literal);
  }
  return false;
}

function createNodeTrackedRepositoryLiteralScanDependencies(): TrackedRepositoryLiteralScanDependencies {
  return {
    listTrackedPaths: listTrackedPathsFromGit,
    readBytes: (absolutePath) => new Uint8Array(readFileSync(absolutePath)),
    lstatEntry: (absolutePath) => lstatSync(absolutePath),
  };
}

async function collectTrackedRepositoryHistoricalLiteralScan(
  rootPath: string,
  dependencies: TrackedRepositoryLiteralScanDependencies,
): Promise<TrackedRepositoryLiteralScanResult> {
  const entries: TrackedRepositoryEntry[] = [];
  const matches: HistoricalLiteralMatch[] = [];
  for (const relativePath of dependencies.listTrackedPaths(rootPath)) {
    const absolutePath = path.join(rootPath, relativePath);
    const entry = dependencies.lstatEntry(absolutePath);
    if (entry.isSymbolicLink()) {
      entries.push({ relativePath, kind: 'symlink' });
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`tracked entry must be a file or symlink: ${relativePath}`);
    }
    const bytes = dependencies.readBytes(absolutePath);
    if (isBinaryContent(bytes)) {
      if (!EXPLICIT_BINARY_TRACKED_PATHS.has(relativePath)) {
        throw new Error(`unexpected binary tracked file: ${relativePath}`);
      }
      entries.push({ relativePath, kind: 'binary' });
      continue;
    }
    entries.push({ relativePath, kind: 'text' });
    const lines = decodeUtf8(bytes).split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const lineText = lines[index] ?? '';
      for (const literal of ATTEMPT_002_HISTORICAL_LITERALS) {
        if (!lineContainsHistoricalLiteral(lineText, literal)) {
          continue;
        }
        matches.push({ relativePath, lineNumber: index + 1, literal, lineText });
      }
    }
  }
  return {
    entries: Object.freeze(entries.map((entry) => Object.freeze({ ...entry }))),
    matches: Object.freeze(matches.map((match) => Object.freeze({ ...match }))),
  };
}

async function collectFileHashes(rootPath: string): Promise<Map<string, string>> {
  const entryNames = (await readdir(rootPath)).sort();
  const hashes = new Map<string, string>();
  for (const entryName of entryNames) {
    const entryPath = path.join(rootPath, entryName);
    const entry = await lstat(entryPath);
    if (entry.isDirectory()) {
      const nestedHashes = await collectFileHashes(entryPath);
      for (const [nestedPath, nestedHash] of nestedHashes) {
        hashes.set(path.posix.join(entryName, nestedPath), nestedHash);
      }
      continue;
    }
    assert.equal(entry.isFile(), true, `expected regular file under ${rootPath}`);
    hashes.set(entryName, digestHex(await readFile(entryPath)));
  }
  return hashes;
}

async function snapshotImmutableAttempt002Publication() {
  return {
    packageDirectoryHashes: await collectFileHashes(path.join(WORKTREE_ROOT, IMMUTABLE_ATTEMPT_002_RELATIVE_DIRECTORY)),
    archiveSha256: digestHex(await readFile(path.join(WORKTREE_ROOT, IMMUTABLE_ATTEMPT_002_RELATIVE_ARCHIVE))),
    receiptSha256: digestHex(await readFile(path.join(WORKTREE_ROOT, IMMUTABLE_ATTEMPT_002_RELATIVE_RECEIPT))),
  };
}

async function readImmutableAttempt002ManifestHashes(): Promise<Record<string, string>> {
  const manifestText = await readFile(path.join(WORKTREE_ROOT, IMMUTABLE_ATTEMPT_002_RELATIVE_DIRECTORY, 'SHA256SUMS.txt'), 'utf8');
  const result: Record<string, string> = {};
  for (const line of manifestText.trimEnd().split('\n')) {
    const [hash, memberName] = line.split('  ');
    assert.ok(hash && memberName, `invalid immutable manifest line: ${line}`);
    result[memberName] = hash;
  }
  return result;
}

type HistoricalLiteralMatch = {
  relativePath: string;
  lineNumber: number;
  literal: string;
  lineText: string;
};

type HistoricalLiteralContextRule = {
  path: string;
  literal?: string;
  exactLineText?: string;
  exactRuleText?: string;
  requiredText?: string;
};

type TrackedRepositoryEntryKind = 'text' | 'binary' | 'symlink';

type TrackedRepositoryEntry = {
  relativePath: string;
  kind: TrackedRepositoryEntryKind;
};

type TrackedRepositoryLiteralScanResult = {
  entries: readonly TrackedRepositoryEntry[];
  matches: readonly HistoricalLiteralMatch[];
};

type TrackedRepositoryLiteralScanDependencies = {
  listTrackedPaths(rootPath: string): readonly string[];
  readBytes(absolutePath: string): Uint8Array;
  lstatEntry(absolutePath: string): { isFile(): boolean; isSymbolicLink(): boolean };
};

// TASK10_SELF_ALLOW_BLOCK_START
const HISTORICAL_LITERAL_CONTEXT_RULES: readonly HistoricalLiteralContextRule[] = Object.freeze([
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: ATTEMPT_002_FULL_CORE_SHA, exactLineText: '- Core SHA: `97e2fbe3934ea821daf654afa0adaef2c3e16077`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: ATTEMPT_002_FULL_EVIDENCE_SHA, exactLineText: '- Core evidence publication commit: `8d2692fea8a450225717c067628bbc0b372c7536`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'attempt-2026-07-18-task10-postmerge-002', exactLineText: '- Attempt id: `attempt-2026-07-18-task10-postmerge-002`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'attempt-2026-07-18-task10-postmerge-002', exactLineText: 'The historical attempt-2026-07-18-task10-postmerge-002 package remains the preserved historical record and is not superseded by this attempt-007 runbook. This document does not rewrite, republish, or operationalize the old attempt-002 package.' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'attempt-2026-07-18-task10-postmerge-002', exactLineText: '- Bundle path: `docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/core-execution-evidence.json`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'attempt-2026-07-18-task10-postmerge-002', exactLineText: '- Preflight path: `docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/preflight-artifact.json`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: ATTEMPT_002_FULL_CORE_SHA, exactLineText: '- Core runtime root: HEAD `97e2fbe3934ea821daf654afa0adaef2c3e16077`, main branch, upstream `origin/main`, empty porcelain, lock hash `504007a7fb70616df1409eb2e003a3470ea6e23d990ea61d8eea195a0a1fce62`, package identity `bidvia-d2-ws6-t1-runtime@0.0.0`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: ATTEMPT_002_FULL_EVIDENCE_SHA, exactLineText: '- Core evidence root: detached HEAD `8d2692fea8a450225717c067628bbc0b372c7536`, null upstream, empty porcelain, bundle SHA `e438232e982722fd4ec431260053eafe369723f93659070688f961a5c740b3db`, preflight SHA `1eee8a5d6de9a34486b287be425b6f747f155c8c83ef436c448e13baf08ad685`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'attempt-2026-07-18-task10-postmerge-002', exactLineText: 'shasum -a 256 "docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/core-execution-evidence.json"' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'attempt-2026-07-18-task10-postmerge-002', exactLineText: 'shasum -a 256 "docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/preflight-artifact.json"' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: ATTEMPT_002_FULL_CORE_SHA, exactLineText: '  --core-sha "97e2fbe3934ea821daf654afa0adaef2c3e16077" \\' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'attempt-2026-07-18-task10-postmerge-002', exactLineText: '  --attempt-id "attempt-2026-07-18-task10-postmerge-002" \\' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: ATTEMPT_002_FULL_CORE_SHA, exactLineText: '  --source-main-commit-marker "97e2fbe3934ea821daf654afa0adaef2c3e16077" \\' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'task10-runtime-97e2fbe', exactLineText: '  --runtime-reported-version-marker "task10-runtime-97e2fbe" \\' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'task10-bootstrap-97e2fbe', exactLineText: '  --bootstrap-package-version-marker "task10-bootstrap-97e2fbe" \\' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'task10-scenario-97e2fbe', exactLineText: '  --scenario-package-version-marker "task10-scenario-97e2fbe" \\' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: '58925', exactLineText: '  --postgres-port "58925" \\' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: '58926', exactLineText: '  --runtime-port "58926" \\' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: '58927', exactLineText: '  --operator-port "58927" \\' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: '58928', exactLineText: '  --fixture-port "58928" \\' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'bidvia-task10-attempt-2026-07-18-task10-postmerge-002', exactLineText: '- Compose project: `bidvia-task10-attempt-2026-07-18-task10-postmerge-002`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-runtime', exactLineText: '- Containers: `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-runtime`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-postgres`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-fixture`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-operator`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-postgres', exactLineText: '- Containers: `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-runtime`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-postgres`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-fixture`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-operator`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-fixture', exactLineText: '- Containers: `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-runtime`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-postgres`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-fixture`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-operator`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-operator', exactLineText: '- Containers: `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-runtime`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-postgres`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-fixture`, `bidvia-task10-attempt-2026-07-18-task10-postmerge-002-operator`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: '58925', exactLineText: '- Ports: `58925`, `58926`, `58927`, `58928`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: '58926', exactLineText: '- Ports: `58925`, `58926`, `58927`, `58928`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: '58927', exactLineText: '- Ports: `58925`, `58926`, `58927`, `58928`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: '58928', exactLineText: '- Ports: `58925`, `58926`, `58927`, `58928`' },
  { path: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md', literal: 'attempt-2026-07-18-task10-postmerge-002', exactLineText: '  --core-bundle "<absolute-detached-core-evidence-root>/docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/core-execution-evidence.json"' },
  { path: 'docs/superpowers/specs/2026-07-20-task10-client-rerun-007-design.md', literal: 'attempt-2026-07-18-task10-postmerge-002', exactLineText: '- Preserve the existing `attempt-2026-07-18-task10-postmerge-002` package, archive, receipt, commit, and Issue comment byte-for-byte.' },
  { path: 'docs/superpowers/specs/2026-07-20-task10-client-rerun-007-design.md', literal: ATTEMPT_002_SHORT_CORE_SHA, exactLineText: 'The migration must search every Task 10 code, test, and runbook file for `attempt-2026-07-18-task10-postmerge-002`, `97e2fbe`, `8d2692f`, old markers, ports, Compose/network/container names, bundle/preflight paths, and old authority URLs. Every active tooling reference moves to attempt 007. The only allowed old-attempt references are the preserved package bytes and explicit historical/non-supersession assertions.' },
  { path: 'docs/superpowers/specs/2026-07-20-task10-client-rerun-007-design.md', literal: ATTEMPT_002_SHORT_EVIDENCE_SHA, exactLineText: 'The migration must search every Task 10 code, test, and runbook file for `attempt-2026-07-18-task10-postmerge-002`, `97e2fbe`, `8d2692f`, old markers, ports, Compose/network/container names, bundle/preflight paths, and old authority URLs. Every active tooling reference moves to attempt 007. The only allowed old-attempt references are the preserved package bytes and explicit historical/non-supersession assertions.' },
  { path: 'test/task10-core-producer-adapter.test.ts', literal: ATTEMPT_002_FULL_CORE_SHA, exactLineText: "  'core:97e2fbe3934ea821daf654afa0adaef2c3e16077:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093'," },
  { path: 'test/task10-core-producer-adapter.test.ts', literal: ATTEMPT_002_FULL_CORE_SHA, exactLineText: "      reusablePacket: buildReusablePacket({ source_refs: ['core:97e2fbe3934ea821daf654afa0adaef2c3e16077:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'] })," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "  attemptId: 'attempt-2026-07-18-task10-postmerge-002'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "  bundlePath: 'docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/core-execution-evidence.json'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "  preflightPath: 'docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/preflight-artifact.json'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "  coreRuntimeSha: '97e2fbe3934ea821daf654afa0adaef2c3e16077'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "  coreEvidencePublicationCommit: '8d2692fea8a450225717c067628bbc0b372c7536'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "  sourceMainCommitMarker: '97e2fbe3934ea821daf654afa0adaef2c3e16077'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "  runtimeReportedVersionMarker: 'task10-runtime-97e2fbe'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "  bootstrapPackageVersionMarker: 'task10-bootstrap-97e2fbe'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "  scenarioPackageVersionMarker: 'task10-scenario-97e2fbe'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "    postgres: '58925'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "    runtime: '58926'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "    operator: '58927'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "    fixture: '58928'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "  composeProject: 'bidvia-task10-attempt-2026-07-18-task10-postmerge-002'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: '  assert.match(markdown, /97e2fbe3934ea821daf654afa0adaef2c3e16077/);' },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: '  assert.match(markdown, /historical attempt-2026-07-18-task10-postmerge-002 package remains the preserved historical record and is not superseded by this attempt-007 runbook/i);' },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: '  assert.match(coordinatorBlock, /--core-bundle "<absolute-detached-core-evidence-root>\\/docs\\/org\\/review-records\\/artifacts\\/attempt-2026-07-18-task10-postmerge-002-output\\/core-execution-evidence\\.json"/);' },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "    'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-runtime'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "    'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-postgres'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "    'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-fixture'," },
  { path: 'test/verify-task10-client-reproducibility.test.ts', exactLineText: "    'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-operator'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "const IMMUTABLE_ATTEMPT_002_PACKAGE_NAME = 'client-task10-reproducibility-attempt-2026-07-18-task10-postmerge-002-20260720T030347Z';" },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: 'const IMMUTABLE_ATTEMPT_002_RELATIVE_DIRECTORY = `provider-proof-terminal-client-validation-artifacts/${IMMUTABLE_ATTEMPT_002_PACKAGE_NAME}`;' },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "const ATTEMPT_002_SHORT_CORE_SHA = '97e2fbe';" },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "const ATTEMPT_002_FULL_CORE_SHA = '97e2fbe3934ea821daf654afa0adaef2c3e16077';" },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "const ATTEMPT_002_SHORT_EVIDENCE_SHA = '8d2692f';" },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "const ATTEMPT_002_FULL_EVIDENCE_SHA = '8d2692fea8a450225717c067628bbc0b372c7536';" },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "const ADAPTER_ALLOWED_COMPATIBILITY_GRAPH_LINE = '  \\'core:97e2fbe3934ea821daf654afa0adaef2c3e16077:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093\\',';" },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'attempt-2026-07-18-task10-postmerge-002'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'97e2fbe3934ea821daf654afa0adaef2c3e16077'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'8d2692fea8a450225717c067628bbc0b372c7536'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'task10-runtime-97e2fbe'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'task10-bootstrap-97e2fbe'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'task10-scenario-97e2fbe'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'58925'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'58926'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'58927'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'58928'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'bidvia-task10-attempt-2026-07-18-task10-postmerge-002'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-runtime'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-postgres'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-fixture'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-operator'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "literal: 'attempt-2026-07-18-task10-postmerge-002'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "literal: '97e2fbe'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "literal: '8d2692f'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "lineText: '- Attempt id: `attempt-2026-07-18-task10-postmerge-002`'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "lineText: '- Core SHA: `97e2fbe3934ea821daf654afa0adaef2c3e16077`'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "lineText: 'active stale attempt-2026-07-18-task10-postmerge-002 should not be allowed here'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "lineText: '- Attempt id: `attempt-2026-07-18-task10-postmerge-002` 8d2692f'," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "const adapterCompatibilityGraphLine = '  \\'core:97e2fbe3934ea821daf654afa0adaef2c3e16077:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093\\',';" },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "lineText: `${adapterCompatibilityGraphLine} attempt-2026-07-18-task10-postmerge-002`," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "lineText: `${adapterCompatibilityGraphLine} 97e2fbe`," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "lineText: `${adapterCompatibilityGraphLine} task10-runtime-97e2fbe`," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "lineText: `${adapterCompatibilityGraphLine} 58925`," },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "&& match.literal === '97e2fbe'" },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "&& match.literal === '8d2692f'" },
  { path: THIS_PUBLICATION_TEST_PATH, requiredText: "&& match.lineText.includes('`97e2fbe`, `8d2692f`')), true);" },
]);
// TASK10_SELF_ALLOW_BLOCK_END

const trackedRepositoryScanPromise = collectTrackedRepositoryHistoricalLiteralScan(WORKTREE_ROOT, {
  ...createNodeTrackedRepositoryLiteralScanDependencies(),
});

function isAllowedHistoricalLiteralMatch(match: HistoricalLiteralMatch): boolean {
  if (match.relativePath === 'scripts/task10/core-producer-adapter.ts') {
    return match.literal === ATTEMPT_002_FULL_CORE_SHA
      && match.lineText === ADAPTER_ALLOWED_COMPATIBILITY_GRAPH_LINE;
  }
  if (match.relativePath === IMMUTABLE_ATTEMPT_002_RELATIVE_RECEIPT || match.relativePath.startsWith(`${IMMUTABLE_ATTEMPT_002_RELATIVE_DIRECTORY}/`)) {
    return true;
  }
  if (match.relativePath === THIS_PUBLICATION_TEST_PATH) {
    if (match.lineText === '  const adapterCompatibilityGraphLine = ADAPTER_ALLOWED_COMPATIBILITY_GRAPH_LINE;') {
      return match.literal === ATTEMPT_002_FULL_CORE_SHA;
    }
    if (match.lineText === SELF_ADAPTER_COMPATIBILITY_GRAPH_DECLARATION_LINE) {
      return match.literal === ATTEMPT_002_FULL_CORE_SHA;
    }
    if (SELF_ALLOWED_EXACT_BLOCK_RANGES.some((range) => match.lineNumber >= range.startLine && match.lineNumber <= range.endLine)) {
      return lineContainsHistoricalLiteral(match.lineText, match.literal);
    }
    const requiredText = extractRequiredTextFromRuleDefinitionLine(match.lineText);
    if (requiredText !== null) {
      return (SELF_ALLOWED_EXACT_LINES.has(requiredText)
        || HISTORICAL_LITERAL_CONTEXT_RULES.some((rule) => rule.exactLineText === requiredText))
        && lineContainsHistoricalLiteral(requiredText, match.literal);
    }
    if (SELF_ALLOWED_EXACT_LINES.has(match.lineText)) {
      return lineContainsHistoricalLiteral(match.lineText, match.literal);
    }
  }
  return HISTORICAL_LITERAL_CONTEXT_RULES.some((rule) => ruleMatchesHistoricalLiteral(match, rule));
}

function buildPrivateSourceMap(seeds?: Partial<Record<(typeof TASK10_PROHIBITED_VALUE_FAMILIES)[number], string>>) {
  const explicitSeeds = seeds ?? {};
  const prohibitedCatalog = buildProhibitedCatalog(explicitSeeds);
  const privateSources = new Map<`sha256:${string}`, { sourceClass: PrivateSourceSeed['sourceClass']; bytes: Uint8Array }>();

  const createSource = (sourceClass: PrivateSourceSeed['sourceClass'], body: string) => {
    const bytes = new TextEncoder().encode(body);
    const handle = `sha256:${digestHex(bytes)}` as const;
    privateSources.set(handle, { sourceClass, bytes });
    return { handle, sourceClass };
  };

  const preflight = createSource('preflight', 'private-preflight-bytes');
  const runtime = createSource('runtime', 'private-runtime-bytes');
  const reset = createSource('reset', 'private-reset-bytes');
  const dispatch = createSource('success-001', 'private-dispatch-bytes');
  const recovery = createSource('recovery-001', 'private-recovery-bytes');
  const reuse = createSource('success-002-reuse', 'private-reuse-bytes');
  const resultSubmission = createSource('success-001', 'private-result-submission-bytes');

  const scenarioRows = [
    buildScenarioRow('session-access', '2026-07-19T01:02:04.000Z', 'POST /runtime/admin/sessions/sign-in request:session-access:001', 'admin-session-bootstrap', 'rehearsal-run-identity', 'session-access-proof', TASK10_AUTHORITY.corePreflightUrl, preflight.handle, preflight.sourceClass, ['authority-identity-match']),
    buildScenarioRow('readiness', '2026-07-19T01:02:05.000Z', 'GET /readyz request:readiness:001', 'runtime-readyz', 'runtime-identity-check', 'readiness-runtime-proof', TASK10_AUTHORITY.corePreflightUrl, runtime.handle, runtime.sourceClass, ['readyz-markers-match']),
    buildScenarioRow('readiness', '2026-07-19T01:02:06.000Z', 'POST /runtime/rehearsals/merged-main/reset request:readiness:002', 'reset-freshness-inspection', 'reset-proof', 'readiness-reset-proof', TASK10_AUTHORITY.corePreflightUrl, reset.handle, reset.sourceClass, ['reset-schema-ready']),
    buildScenarioRow('dispatch', '2026-07-19T01:02:07.000Z', `POST /runtime/agents/:registrationId/task-dispatches ${prohibitedCatalog['generated account identifiers'][0] ?? 'request:dispatch:001'}`, 'registration-bound-dispatch', prohibitedCatalog['account session ids'][0] ?? 'persisted-dispatch-readback', prohibitedCatalog.tokens[0] ?? 'dispatch-proof', TASK10_AUTHORITY.coreBundleUrl, dispatch.handle, dispatch.sourceClass, ['dispatch-readback-persisted']),
    buildScenarioRow('replay-recovery', '2026-07-19T01:02:08.000Z', 'POST /runtime/commercial-actions/:id/rollback request:replay-recovery:001', prohibitedCatalog['absolute local paths'][0] ?? 'rollback-request', prohibitedCatalog.passwords[0] ?? 'recovery-lineage', prohibitedCatalog['credential secret refs'][0] ?? 'recovery-proof', TASK10_AUTHORITY.coreBundleUrl, recovery.handle, recovery.sourceClass, ['recovery-lineage-present']),
    buildScenarioRow('replay-recovery', '2026-07-19T01:02:09.000Z', 'POST /runtime/rehearsals/merged-main/readback/:runId request:replay-recovery:002', prohibitedCatalog['request and response bodies'][0] ?? 'reuse-readback', prohibitedCatalog['fixture credentials'][0] ?? 'distinct-current-execution-ids', prohibitedCatalog['email addresses'][0] ?? 'reuse-proof', TASK10_AUTHORITY.coreBundleUrl, reuse.handle, reuse.sourceClass, ['distinct-reuse-truth']),
    buildScenarioRow('result-submission', '2026-07-19T01:02:10.000Z', 'POST /runtime/commercial-actions/:id/execute request:result-submission:001', prohibitedCatalog['admin session ids'][0] ?? 'commercial-action-execution', 'provider-receipt-evidence', 'result-submission-proof', TASK10_AUTHORITY.coreBundleUrl, resultSubmission.handle, resultSubmission.sourceClass, ['provider-proof-and-receipt-present']),
  ];

  return {
    prohibitedCatalog,
    privateSources,
    scenarioRows,
  };
}

function buildProhibitedCatalog(seeds: Partial<Record<(typeof TASK10_PROHIBITED_VALUE_FAMILIES)[number], string>> = {}): Task10ProhibitedValueCatalog {
  return {
    'admin session ids': seeds['admin session ids'] ? [seeds['admin session ids']] : [],
    'account session ids': seeds['account session ids'] ? [seeds['account session ids']] : [],
    passwords: seeds.passwords ? [seeds.passwords] : [],
    tokens: seeds.tokens ? [seeds.tokens] : [],
    'credential secret refs': seeds['credential secret refs'] ? [seeds['credential secret refs']] : [],
    'fixture credentials': seeds['fixture credentials'] ? [seeds['fixture credentials']] : [],
    'email addresses': seeds['email addresses'] ? [seeds['email addresses']] : [],
    'generated account identifiers': seeds['generated account identifiers'] ? [seeds['generated account identifiers']] : [],
    'request and response bodies': seeds['request and response bodies'] ? [seeds['request and response bodies']] : [],
    'absolute local paths': seeds['absolute local paths'] ? [seeds['absolute local paths']] : [],
  };
}

function buildScenarioRow(
  scenarioFamily: (typeof TASK10_REQUIRED_SCENARIO_FAMILIES)[number],
  timestamp: string,
  request: string,
  sourceObject: string,
  targetObject: string,
  proofClass: string,
  authority: string,
  handle: `sha256:${string}`,
  sourceClass: PrivateSourceSeed['sourceClass'],
  reasonCodes: readonly string[],
) {
  return {
    scenarioFamily,
    tenant: 'tenant:task10-owner',
    actor: 'actor:operator-admin',
    company: 'company:owner',
    authority,
    request,
    sourceObject,
    targetObject,
    proofClass,
    evidenceRefs: [authority].sort(),
    privateEvidenceHandles: [handle],
    privateEvidenceAttestations: [{ handle, sourceClass, verified: true as const, verifiedAt: timestamp }],
    result: 'passed' as const,
    timestamp,
    reasonCodes: [...reasonCodes].sort(),
  };
}

function buildFixture(input: {
  decision?: Task10PublicationDecision;
  prohibitedCatalog?: Task10ProhibitedValueCatalog;
  scenarioRows?: ReturnType<typeof buildPrivateSourceMap>['scenarioRows'];
  privateSources?: Task10PrivateSourceMap;
} = {}) {
  const privateFixture = buildPrivateSourceMap();
  const decision = input.decision ?? {
    conclusion: 'blocked',
    reasonCodes: ['core-producer-private-root-contract-unsatisfied', 'result-submission-blocked'],
    missingEvidence: ['dispatch owner-run materialization output', 'result-submission provider receipt continuity'],
  };
  const scenarioRows = input.scenarioRows ?? privateFixture.scenarioRows;
  const privateSources = input.privateSources ?? privateFixture.privateSources;
  const prohibitedCatalog = input.prohibitedCatalog ?? EMPTY_TASK10_PROHIBITED_VALUE_CATALOG;
  const fingerprint = {
    schemaVersion: 'bidvia-client-task10-fingerprint/v1' as const,
    repository: TASK10_AUTHORITY.repository,
    attemptId: TASK10_AUTHORITY.attemptId,
    clientBaselineSha: TASK10_AUTHORITY.clientBaselineSha,
    coreRuntimeSha: TASK10_AUTHORITY.coreRuntimeSha,
    siteBaselineSha: TASK10_AUTHORITY.siteBaselineSha,
    coreEvidencePublicationCommit: TASK10_AUTHORITY.coreEvidencePublicationCommit,
    coreBundlePath: TASK10_AUTHORITY.coreBundlePath,
    coreBundleSha256: TASK10_AUTHORITY.coreBundleSha256,
    packageIdentities: {
      core: TASK10_AUTHORITY.packageIdentities.core,
      client: TASK10_AUTHORITY.packageIdentities.client,
      site: TASK10_AUTHORITY.packageIdentities.site,
    },
    lockfileSha256: {
      core: TASK10_AUTHORITY.lockfileSha256.core,
      client: TASK10_AUTHORITY.lockfileSha256.client,
      site: TASK10_AUTHORITY.lockfileSha256.site,
    },
    runtimeMarkers: {
      sourceMainCommitMarker: TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker,
      runtimeReportedVersionMarker: TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker,
      bootstrapPackageVersionMarker: TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker,
      scenarioPackageVersionMarker: TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker,
      providerFixtureIdentity: TASK10_AUTHORITY.providerFixtureIdentity,
      providerProtocolVersion: TASK10_AUTHORITY.providerProtocolVersion,
      postgresPort: TASK10_AUTHORITY.ports.postgres,
      runtimePort: TASK10_AUTHORITY.ports.runtime,
      operatorPort: TASK10_AUTHORITY.ports.operator,
      fixturePort: TASK10_AUTHORITY.ports.fixture,
    },
    toolVersions: {
      node: 'v24.6.0',
      npm: '11.5.1',
      docker: '28.4.0',
      dockerCompose: '2.39.4-desktop.1',
      postgresClient: '15.13',
    },
    checkoutProofs: {
      coreRuntime: {
        headCommit: TASK10_AUTHORITY.coreRuntimeSha,
        branch: 'main',
        upstreamRef: 'origin/main',
        detachedHead: false,
        porcelainStatus: 'empty' as const,
        lockfileSha256: TASK10_AUTHORITY.lockfileSha256.core,
      },
      clientValidation: {
        headCommit: TASK10_AUTHORITY.clientBaselineSha,
        branch: 'main',
        upstreamRef: 'origin/main',
        detachedHead: false,
        porcelainStatus: 'empty' as const,
        lockfileSha256: TASK10_AUTHORITY.lockfileSha256.client,
      },
      siteValidation: {
        headCommit: TASK10_AUTHORITY.siteBaselineSha,
        branch: 'main',
        upstreamRef: 'origin/main',
        detachedHead: false,
        porcelainStatus: 'empty' as const,
        lockfileSha256: TASK10_AUTHORITY.lockfileSha256.site,
      },
      coreEvidence: {
        headCommit: TASK10_AUTHORITY.coreEvidencePublicationCommit,
        branch: null,
        upstreamRef: null,
        detachedHead: true,
        porcelainStatus: 'empty' as const,
        lockfileSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
    },
    runStartedAt: RUN_STARTED_AT,
  };
  const commandLog = {
    schemaVersion: 'bidvia-client-task10-command-log/v1' as const,
    attemptId: TASK10_AUTHORITY.attemptId,
    commands: [
      { command: 'npm test' as const, cwd: 'frozen-client-root' as const, startedAt: '2026-07-19T01:02:03.000Z', endedAt: '2026-07-19T01:02:13.000Z', status: 'executed' as const, exitCode: 0, skippedDueTo: null },
      { command: 'npm run typecheck' as const, cwd: 'frozen-client-root' as const, startedAt: '2026-07-19T01:02:14.000Z', endedAt: '2026-07-19T01:02:20.000Z', status: 'executed' as const, exitCode: 0, skippedDueTo: null },
      { command: 'npm run build' as const, cwd: 'frozen-client-root' as const, startedAt: '2026-07-19T01:02:21.000Z', endedAt: '2026-07-19T01:02:27.000Z', status: 'executed' as const, exitCode: 0, skippedDueTo: null },
      { command: 'npm run validate' as const, cwd: 'frozen-client-root' as const, startedAt: '2026-07-19T01:02:28.000Z', endedAt: '2026-07-19T01:02:34.000Z', status: 'executed' as const, exitCode: 0, skippedDueTo: null },
      { command: 'npm run validate:release-readiness' as const, cwd: 'frozen-client-root' as const, startedAt: '2026-07-19T01:02:35.000Z', endedAt: '2026-07-19T01:02:39.000Z', status: 'executed' as const, exitCode: 0, skippedDueTo: null },
      { command: 'npm run validate:release-gate' as const, cwd: 'frozen-client-root' as const, startedAt: '2026-07-19T01:02:40.000Z', endedAt: '2026-07-19T01:02:44.000Z', status: 'executed' as const, exitCode: 0, skippedDueTo: null },
    ],
  };
  return {
    privateSources,
    candidate: assembleCandidatePayload({
      decision,
      fingerprint,
      commandLog,
      scenarioRows,
      generatedAt: GENERATED_AT,
      prohibitedValues: prohibitedCatalog,
    }),
  };
}

function createFakeArchiveDependencies(options: {
  listOverride?: readonly Task10ArchiveMember[];
  archiveBytesSuffix?: string;
  mutateMemberBytes?: Readonly<Record<string, Uint8Array>>;
  archiveBytesOverride?: Uint8Array;
  onListArchiveMembers?: (archivePath: string) => Promise<void> | void;
  onReadArchiveMember?: (archivePath: string, memberPath: string) => Promise<void> | void;
} = {}): Task10ArchiveDependencies {
  return {
    async archiveDirectory(input) {
      if (options.archiveBytesOverride) {
        await writeFile(input.archivePath, options.archiveBytesOverride, { mode: 0o600, flag: 'wx' });
        return;
      }
      const memberNames = (await readdir(input.sourceDirectory)).sort();
      const encodedMembers: string[] = [];
      for (const memberName of memberNames) {
        const bytes = options.mutateMemberBytes?.[memberName] ?? await readFile(path.join(input.sourceDirectory, memberName));
        encodedMembers.push(`${memberName}:${Buffer.from(bytes).toString('base64')}`);
      }
      const lines = [
        'TASK10_FAKE_ARCHIVE_V1',
        `root=${input.rootName}`,
        ...memberNames.map((memberName) => `file=${memberName}`),
        ...encodedMembers.map((entry) => `bytes=${entry}`),
        options.archiveBytesSuffix ?? '',
      ].filter(Boolean);
      await writeFile(input.archivePath, `${lines.join('\n')}\n`, { mode: 0o600, flag: 'wx' });
    },
    async listArchiveMembers(input) {
      await options.onListArchiveMembers?.(input.archivePath);
      if (options.listOverride) {
        return options.listOverride;
      }
      const text = await readFile(input.archivePath, 'utf8');
      const rootLine = text.split('\n').find((line) => line.startsWith('root='));
      const rootName = rootLine?.slice('root='.length);
      assert.ok(rootName, 'fake archive must record a root name');
      const fileEntries = text.split('\n').filter((line) => line.startsWith('file=')).map((line) => line.slice('file='.length));
      return [
        { path: rootName, type: 'directory' as const },
        ...fileEntries.map((memberName) => ({ path: `${rootName}/${memberName}`, type: 'file' as const })),
      ];
    },
    async readArchiveMember(input) {
      await options.onReadArchiveMember?.(input.archivePath, input.memberPath);
      const text = await readFile(input.archivePath, 'utf8');
      const rootLine = text.split('\n').find((line) => line.startsWith('root='));
      const rootName = rootLine?.slice('root='.length);
      assert.ok(rootName, 'fake archive must record a root name');
      const byteEntries = new Map(
        text
          .split('\n')
          .filter((line) => line.startsWith('bytes='))
          .map((line) => {
            const payload = line.slice('bytes='.length);
            const separatorIndex = payload.indexOf(':');
            return [payload.slice(0, separatorIndex), Buffer.from(payload.slice(separatorIndex + 1), 'base64')];
          }),
      );
      const expectedPrefix = `${rootName}/`;
      assert.equal(input.memberPath.startsWith(expectedPrefix), true);
      const memberName = input.memberPath.slice(expectedPrefix.length);
      const bytes = byteEntries.get(memberName);
      assert.ok(bytes, `fake archive is missing bytes for ${memberName}`);
      return new Uint8Array(bytes);
    },
  };
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await lstat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function createPublicationRoot() {
  const tempParent = await mkdtemp(path.join(await realpath(os.tmpdir()), 'task10-publication-'));
  const publicationRoot = path.join(tempParent, PUBLICATION_ROOT_BASENAME);
  await mkdir(publicationRoot, { recursive: true, mode: 0o700 });
  return { tempParent, publicationRoot };
}

async function materializeWithFakeArchive(input: Omit<Task10MaterializePublicationInput, 'archive'> & { archive?: Task10ArchiveDependencies }) {
  return materializeTask10Publication({
    ...input,
    archive: input.archive ?? createFakeArchiveDependencies(),
  });
}

async function readPackageBytes(packageDirectoryPath: string) {
  const members = (await readdir(packageDirectoryPath)).sort();
  const byName = new Map<string, Uint8Array>();
  for (const memberName of members) {
    byName.set(memberName, await readFile(path.join(packageDirectoryPath, memberName)));
  }
  return byName;
}

async function rewriteManifestAndReceipt(packageDirectoryPath: string, receiptPath: string) {
  const manifestMembers = [...TASK10_CONTENT_FILES, 'secret-review.json'].sort();
  const manifestLines: string[] = [];
  for (const memberName of manifestMembers) {
    const bytes = await readFile(path.join(packageDirectoryPath, memberName));
    manifestLines.push(`${digestHex(bytes)}  ${memberName}`);
  }
  const manifestText = `${manifestLines.join('\n')}\n`;
  await writeFile(path.join(packageDirectoryPath, 'SHA256SUMS.txt'), manifestText, 'utf8');

  const receipt = JSON.parse(await readFile(receiptPath, 'utf8')) as { internal_hash_manifest_sha256: string };
  receipt.internal_hash_manifest_sha256 = digestHex(new TextEncoder().encode(manifestText));
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

async function rewriteFakeArchiveFromPackage(packageDirectoryPath: string, archivePath: string, packageName: string) {
  const memberNames = (await readdir(packageDirectoryPath)).sort();
  const lines = [
    'TASK10_FAKE_ARCHIVE_V1',
    `root=${packageName}`,
    ...memberNames.map((memberName) => `file=${memberName}`),
  ];
  for (const memberName of memberNames) {
    const bytes = await readFile(path.join(packageDirectoryPath, memberName));
    lines.push(`bytes=${memberName}:${Buffer.from(bytes).toString('base64')}`);
  }
  await writeFile(archivePath, `${lines.join('\n')}\n`, 'utf8');
}

function sourceScanForForbiddenConclusionAssignments(sourceText: string): { forbiddenAssignments: string[]; forbiddenIdentifiers: string[] } {
  const sourceFile = ts.createSourceFile('publication.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const forbiddenAssignments: string[] = [];
  const forbiddenIdentifiers: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isImportSpecifier(node)) {
      const imported = node.propertyName?.text ?? node.name.text;
      if (imported === 'finalizeTask10Conclusion' || imported === 'evaluateExecutionEvidence') {
        forbiddenIdentifiers.push(imported);
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'finalizeTask10Conclusion' || node.expression.text === 'evaluateExecutionEvidence') {
        forbiddenIdentifiers.push(node.expression.text);
      }
    }
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === 'conclusion' && ts.isStringLiteral(node.initializer)) {
      if (node.initializer.text === 'passed' || node.initializer.text === 'blocked') {
        forbiddenAssignments.push(node.getText(sourceFile));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { forbiddenAssignments, forbiddenIdentifiers };
}

test('Task 10 publication assembly exports the required API, preserves evaluator decision authority, and uses the exact frozen package name', async () => {
  assert.equal(typeof assembleCandidatePayload, 'function');
  assert.equal(typeof assessCandidatePublication, 'function');
  assert.equal(typeof freezeTask10Publication, 'function');
  assert.equal(typeof discardTask10Publication, 'function');
  assert.equal(typeof validateProducerPublication, 'function');
  assert.equal(typeof validateOfflinePublication, 'function');
  assert.equal(typeof materializeTask10Publication, 'function');

  assert.equal(buildTask10PackageName(RUN_STARTED_AT), EXPECTED_PACKAGE_NAME);

  const fixture = buildFixture();
  assert.deepEqual(Object.keys(fixture.candidate).sort(), ['checks', 'clientConclusion', 'packageMembers', 'packageName']);
  assert.equal(Object.isFrozen(fixture.candidate), true);
  assert.equal(Object.isFrozen(fixture.candidate.clientConclusion), true);
  assert.equal(fixture.candidate.packageName, EXPECTED_PACKAGE_NAME);
  assert.deepEqual(fixture.candidate.packageMembers, PACKAGE_MEMBER_NAMES);
  assert.equal(fixture.candidate.clientConclusion.conclusion, 'blocked');
  assert.deepEqual(fixture.candidate.clientConclusion.reasonCodes, ['core-producer-private-root-contract-unsatisfied', 'result-submission-blocked']);
  assert.deepEqual(fixture.candidate.clientConclusion.missingEvidence, ['dispatch owner-run materialization output', 'result-submission provider receipt continuity']);

  const publicationSource = await readFile(new URL('../scripts/task10/publication.ts', import.meta.url), 'utf8');
  const scan = sourceScanForForbiddenConclusionAssignments(publicationSource);
  assert.deepEqual(scan.forbiddenAssignments, []);
  assert.deepEqual(scan.forbiddenIdentifiers, []);
});

test('Task 10 publication isolates attempt-007 package naming, preserves checked-in attempt-002 bytes, and binds the new attempt across package outputs', async () => {
  const immutableBefore = await snapshotImmutableAttempt002Publication();
  const immutableManifestHashes = await readImmutableAttempt002ManifestHashes();
  const fixture = buildFixture();
  const root = await createPublicationRoot();

  try {
    assert.deepEqual([...immutableBefore.packageDirectoryHashes.keys()].sort(), PACKAGE_MEMBER_NAMES);
    assert.deepEqual(Object.fromEntries(immutableBefore.packageDirectoryHashes), IMMUTABLE_ATTEMPT_002_APPROVED_PACKAGE_HASHES);
    assert.deepEqual(immutableManifestHashes, IMMUTABLE_ATTEMPT_002_APPROVED_MANIFEST_HASHES);
    assert.equal(immutableBefore.archiveSha256, IMMUTABLE_ATTEMPT_002_APPROVED_ARCHIVE_SHA256);
    assert.equal(immutableBefore.receiptSha256, IMMUTABLE_ATTEMPT_002_APPROVED_RECEIPT_SHA256);

    const publication = await materializeWithFakeArchive({
      publicationRoot: root.publicationRoot,
      candidate: fixture.candidate,
      privateSources: fixture.privateSources,
    });
    const packageBytes = await readPackageBytes(publication.packageDirectoryPath);
    const receiptWire = parseTask10PublicationReceiptWire(JSON.parse(await readFile(publication.receiptPath, 'utf8')) as unknown);
    const secretReview = parseTask10SecretReviewWire(JSON.parse(new TextDecoder().decode(packageBytes.get('secret-review.json')!)) as unknown);

    assert.equal(publication.packageName.startsWith(`client-task10-reproducibility-${TASK10_AUTHORITY.attemptId}-`), true);
    assert.notEqual(publication.packageName, IMMUTABLE_ATTEMPT_002_PACKAGE_NAME);
    assert.equal(await pathExists(path.join(root.publicationRoot, IMMUTABLE_ATTEMPT_002_PACKAGE_NAME)), false);
    assert.equal(await pathExists(path.join(root.publicationRoot, `${IMMUTABLE_ATTEMPT_002_PACKAGE_NAME}.tar.gz`)), false);
    assert.equal(await pathExists(path.join(root.publicationRoot, `${IMMUTABLE_ATTEMPT_002_PACKAGE_NAME}.publication.json`)), false);

    assert.equal(new TextDecoder().decode(packageBytes.get('README.md')!).includes(TASK10_AUTHORITY.attemptId), true);
    assert.equal(new TextDecoder().decode(packageBytes.get('client-conclusion.json')!).includes(TASK10_AUTHORITY.attemptId), true);
    assert.equal(new TextDecoder().decode(packageBytes.get('client-fingerprint.json')!).includes(TASK10_AUTHORITY.attemptId), true);
    assert.equal(new TextDecoder().decode(packageBytes.get('command-log.json')!).includes(TASK10_AUTHORITY.attemptId), true);
    assert.equal(new TextDecoder().decode(packageBytes.get('scenario-matrix.json')!).includes(TASK10_AUTHORITY.attemptId), true);
    assert.deepEqual(secretReview.scope.wrapper_files, [
      'secret-review.json',
      'SHA256SUMS.txt',
      `${EXPECTED_PACKAGE_NAME}.tar.gz`,
      `${EXPECTED_PACKAGE_NAME}.publication.json`,
    ]);
    assert.equal(receiptWire.attempt_id, TASK10_AUTHORITY.attemptId);
    assert.equal(receiptWire.package_directory, `${PUBLICATION_ROOT_BASENAME}/${EXPECTED_PACKAGE_NAME}`);
    assert.equal(receiptWire.archive_path, `${PUBLICATION_ROOT_BASENAME}/${EXPECTED_PACKAGE_NAME}.tar.gz`);
    assert.equal(receiptWire.internal_hash_manifest, `${PUBLICATION_ROOT_BASENAME}/${EXPECTED_PACKAGE_NAME}/SHA256SUMS.txt`);

    const immutableAfter = await snapshotImmutableAttempt002Publication();
    assert.deepEqual(Object.fromEntries(immutableAfter.packageDirectoryHashes), IMMUTABLE_ATTEMPT_002_APPROVED_PACKAGE_HASHES);
    assert.equal(immutableAfter.archiveSha256, IMMUTABLE_ATTEMPT_002_APPROVED_ARCHIVE_SHA256);
    assert.equal(immutableAfter.receiptSha256, IMMUTABLE_ATTEMPT_002_APPROVED_RECEIPT_SHA256);
  } finally {
    await rm(root.tempParent, { recursive: true, force: true });
  }
});

test('Task 10 publication historical literal allowlisting requires explicit context and does not allow entire files', () => {
  assert.equal(isAllowedHistoricalLiteralMatch({
    relativePath: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md',
    lineNumber: 25,
    literal: 'attempt-2026-07-18-task10-postmerge-002',
    lineText: '- Attempt id: `attempt-2026-07-18-task10-postmerge-002`',
  }), true);

  assert.equal(isAllowedHistoricalLiteralMatch({
    relativePath: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md',
    lineNumber: 999,
    literal: 'attempt-2026-07-18-task10-postmerge-002',
    lineText: 'active stale attempt-2026-07-18-task10-postmerge-002 should not be allowed here',
  }), false);

  assert.equal(isAllowedHistoricalLiteralMatch({
    relativePath: 'docs/superpowers/specs/2026-07-20-task10-client-rerun-007-design.md',
    lineNumber: 76,
    literal: '97e2fbe',
    lineText: 'The migration must search every Task 10 code, test, and runbook file for `attempt-2026-07-18-task10-postmerge-002`, `97e2fbe`, `8d2692f`, old markers, ports, Compose/network/container names, bundle/preflight paths, and old authority URLs. Every active tooling reference moves to attempt 007. The only allowed old-attempt references are the preserved package bytes and explicit historical/non-supersession assertions.',
  }), true);
  assert.equal(isAllowedHistoricalLiteralMatch({
    relativePath: 'docs/superpowers/specs/2026-07-20-task10-client-rerun-007-design.md',
    lineNumber: 76,
    literal: '97e2fbe',
    lineText: 'ACTIVE: The migration must search every Task 10 code, test, and runbook file for `attempt-2026-07-18-task10-postmerge-002`, `97e2fbe`, `8d2692f`, old markers, ports, Compose/network/container names, bundle/preflight paths, and old authority URLs. Every active tooling reference moves to attempt 007. The only allowed old-attempt references are the preserved package bytes and explicit historical/non-supersession assertions.',
  }), false);

  assert.equal(isAllowedHistoricalLiteralMatch({
    relativePath: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md',
    lineNumber: 21,
    literal: '97e2fbe',
    lineText: '- Core SHA: `97e2fbe3934ea821daf654afa0adaef2c3e16077`',
  }), false);

  assert.equal(isAllowedHistoricalLiteralMatch({
    relativePath: 'docs/TASK10_CLIENT_REPRODUCIBILITY.md',
    lineNumber: 25,
    literal: '8d2692f',
    lineText: '- Attempt id: `attempt-2026-07-18-task10-postmerge-002` 8d2692f',
  }), false);

  // TASK10_SELF_ALLOW_ADAPTER_TEST_START
  const adapterCompatibilityGraphLine = ADAPTER_ALLOWED_COMPATIBILITY_GRAPH_LINE;
  assert.equal(isAllowedHistoricalLiteralMatch({
    relativePath: 'scripts/task10/core-producer-adapter.ts',
    lineNumber: 59,
    literal: ATTEMPT_002_FULL_CORE_SHA,
    lineText: adapterCompatibilityGraphLine,
  }), true);
  assert.equal(isAllowedHistoricalLiteralMatch({
    relativePath: 'scripts/task10/core-producer-adapter.ts',
    lineNumber: 59,
    literal: ATTEMPT_002_FULL_EVIDENCE_SHA,
    lineText: `${adapterCompatibilityGraphLine} ${ATTEMPT_002_FULL_EVIDENCE_SHA}`,
  }), false);
  assert.equal(isAllowedHistoricalLiteralMatch({
    relativePath: 'scripts/task10/core-producer-adapter.ts',
    lineNumber: 59,
    literal: 'attempt-2026-07-18-task10-postmerge-002',
    lineText: `${adapterCompatibilityGraphLine} attempt-2026-07-18-task10-postmerge-002`,
  }), false);
  assert.equal(isAllowedHistoricalLiteralMatch({
    relativePath: 'scripts/task10/core-producer-adapter.ts',
    lineNumber: 59,
    literal: ATTEMPT_002_SHORT_CORE_SHA,
    lineText: `${adapterCompatibilityGraphLine} 97e2fbe`,
  }), false);
  assert.equal(isAllowedHistoricalLiteralMatch({
    relativePath: 'scripts/task10/core-producer-adapter.ts',
    lineNumber: 59,
    literal: 'task10-runtime-97e2fbe',
    lineText: `${adapterCompatibilityGraphLine} task10-runtime-97e2fbe`,
  }), false);
  assert.equal(isAllowedHistoricalLiteralMatch({
    relativePath: 'scripts/task10/core-producer-adapter.ts',
    lineNumber: 59,
    literal: '58925',
    lineText: `${adapterCompatibilityGraphLine} 58925`,
  }), false);
  // TASK10_SELF_ALLOW_ADAPTER_TEST_END
});

test('Task 10 publication helper scan records standalone abbreviated stale SHAs without matching them inside full SHAs', async () => {
  const tempRoot = await mkdtemp(path.join(await realpath(os.tmpdir()), 'task10-publication-short-sha-'));

  try {
    const shortLinePath = path.join(tempRoot, 'short-sha.txt');
    const fullLinePath = path.join(tempRoot, 'full-sha.txt');
    await writeFile(shortLinePath, 'markers: 97e2fbe 8d2692f\n', 'utf8');
    await writeFile(fullLinePath, `full: ${ATTEMPT_002_FULL_CORE_SHA} ${ATTEMPT_002_FULL_EVIDENCE_SHA}\n`, 'utf8');

    const scan = await collectTrackedRepositoryHistoricalLiteralScan(tempRoot, {
      listTrackedPaths: () => ['short-sha.txt', 'full-sha.txt'],
      readBytes: (absolutePath) => new Uint8Array(readFileSync(absolutePath)),
      lstatEntry: () => ({
        isFile: () => true,
        isSymbolicLink: () => false,
      }),
    });

    assert.equal(scan.matches.some((match) => match.relativePath === 'short-sha.txt' && match.literal === ATTEMPT_002_SHORT_CORE_SHA), true);
    assert.equal(scan.matches.some((match) => match.relativePath === 'short-sha.txt' && match.literal === ATTEMPT_002_SHORT_EVIDENCE_SHA), true);
    assert.equal(scan.matches.some((match) => match.relativePath === 'full-sha.txt' && match.literal === ATTEMPT_002_SHORT_CORE_SHA), false);
    assert.equal(scan.matches.some((match) => match.relativePath === 'full-sha.txt' && match.literal === ATTEMPT_002_SHORT_EVIDENCE_SHA), false);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('Task 10 publication tracked-file scan covers textual tracked files regardless of extension and explicitly handles symlinks', async () => {
  const tempRoot = await mkdtemp(path.join(await realpath(os.tmpdir()), 'task10-publication-scan-'));

  try {
    const scriptPath = path.join(tempRoot, 'scan-fixture.sh');
    const yamlPath = path.join(tempRoot, 'scan-fixture.yaml');
    const extensionlessPath = path.join(tempRoot, 'scan-fixture');
    const symlinkPath = path.join(tempRoot, 'scan-fixture.link');
    await writeFile(scriptPath, 'attempt-2026-07-18-task10-postmerge-002\n', 'utf8');
    await writeFile(yamlPath, 'core_sha: 97e2fbe\n', 'utf8');
    await writeFile(extensionlessPath, 'evidence_sha: 8d2692f\n', 'utf8');
    await symlink(scriptPath, symlinkPath);

    const scan = await collectTrackedRepositoryHistoricalLiteralScan(tempRoot, {
      listTrackedPaths: () => ['scan-fixture.sh', 'scan-fixture.yaml', 'scan-fixture', 'scan-fixture.link'],
      readBytes: (absolutePath) => new Uint8Array(readFileSync(absolutePath)),
      lstatEntry: (absolutePath) => absolutePath === symlinkPath ? {
        isFile: () => false,
        isSymbolicLink: () => true,
      } : lstatSync(absolutePath),
    });

    assert.deepEqual(scan.entries, [
      { relativePath: 'scan-fixture.sh', kind: 'text' },
      { relativePath: 'scan-fixture.yaml', kind: 'text' },
      { relativePath: 'scan-fixture', kind: 'text' },
      { relativePath: 'scan-fixture.link', kind: 'symlink' },
    ]);
    assert.equal(scan.matches.some((match) => match.relativePath === 'scan-fixture.sh' && match.literal === 'attempt-2026-07-18-task10-postmerge-002'), true);
    assert.equal(scan.matches.some((match) => match.relativePath === 'scan-fixture.yaml' && match.literal === '97e2fbe'), true);
    assert.equal(scan.matches.some((match) => match.relativePath === 'scan-fixture' && match.literal === '8d2692f'), true);
    assert.equal(scan.matches.some((match) => match.relativePath === 'scan-fixture.link'), false);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('Task 10 publication tracked-file scan rejects unexpected binary tracked files', async () => {
  const tempRoot = await mkdtemp(path.join(await realpath(os.tmpdir()), 'task10-publication-binary-'));

  try {
    const binaryPath = path.join(tempRoot, 'unexpected.bin');
    await writeFile(binaryPath, new Uint8Array([0, 1, 2, 3]));

    await assert.rejects(
      collectTrackedRepositoryHistoricalLiteralScan(tempRoot, {
        listTrackedPaths: () => ['unexpected.bin'],
        readBytes: (absolutePath) => new Uint8Array(readFileSync(absolutePath)),
        lstatEntry: (absolutePath) => lstatSync(absolutePath),
      }),
      /unexpected binary tracked file/i,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('Task 10 publication tracked-file scan accepts the exact immutable attempt-007 archive', async () => {
  const scan = await collectTrackedRepositoryHistoricalLiteralScan(WORKTREE_ROOT, {
    listTrackedPaths: () => [IMMUTABLE_ATTEMPT_007_RELATIVE_ARCHIVE],
    readBytes: () => new Uint8Array([0, 1, 2, 3]),
    lstatEntry: () => ({
      isFile: () => true,
      isSymbolicLink: () => false,
    }),
  });

  assert.deepEqual(scan.entries, [{
    relativePath: IMMUTABLE_ATTEMPT_007_RELATIVE_ARCHIVE,
    kind: 'binary',
  }]);
});

test('Task 10 publication tracked-file scan implementation uses Node file APIs without python subprocess helpers', async () => {
  const sourceText = await readFile(new URL('../test/task10-publication.test.ts', import.meta.url), 'utf8');
  const pythonCommandName = ['py', 'thon3'].join('');

  assert.equal(sourceText.includes(pythonCommandName), false);
});

test('Task 10 publication repository scan allows attempt-002 literals only in preserved immutable artifacts or explicit historical assertions', async () => {
  const scan = await trackedRepositoryScanPromise;
  const disallowed = scan.matches.filter((match) => !isAllowedHistoricalLiteralMatch(match));

  assert.deepEqual(disallowed, []);
  assert.equal(scan.entries.some((entry) => entry.relativePath === IMMUTABLE_ATTEMPT_002_RELATIVE_ARCHIVE && entry.kind === 'binary'), true);
  assert.equal(scan.entries.some((entry) => entry.kind === 'symlink'), false);
});

test('Task 10 candidate assessment rejects forged, cloned, or mutated path-bearing candidates before publicationRoot side effects', async () => {
  const fixture = buildFixture();
  const parent = await mkdtemp(path.join(await realpath(os.tmpdir()), 'task10-candidate-forge-'));
  const publicationRoot = path.join(parent, 'publication-root-not-created');
  const escapedFilePath = path.join(parent, 'outside');

  try {
    const forgedCandidate = {
      ...fixture.candidate,
      packageName: '../../outside',
      packageMembers: ['../escape'],
    } as unknown as Parameters<typeof assessCandidatePublication>[0]['candidate'];
    await assert.rejects(
      assessCandidatePublication({
        publicationRoot,
        candidate: forgedCandidate,
        privateSources: fixture.privateSources,
        archive: createFakeArchiveDependencies(),
      }),
      /candidate/i,
    );

    const clonedCandidate = { ...fixture.candidate } as Parameters<typeof assessCandidatePublication>[0]['candidate'];
    await assert.rejects(
      assessCandidatePublication({
        publicationRoot,
        candidate: clonedCandidate,
        privateSources: fixture.privateSources,
        archive: createFakeArchiveDependencies(),
      }),
      /candidate/i,
    );

    assert.throws(() => {
      (fixture.candidate as { packageName?: string }).packageName = '../../outside';
    });
    const validAssessment = await assessCandidatePublication({
      publicationRoot: path.join(parent, 'real-publication-root'),
      candidate: fixture.candidate,
      privateSources: fixture.privateSources,
      archive: createFakeArchiveDependencies(),
    });
    assert.equal(validAssessment.ok, true);
    await discardTask10Publication(validAssessment.staged);

    assert.equal(await pathExists(publicationRoot), false);
    assert.equal(await pathExists(escapedFilePath), false);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('Task 10 staged publication assessment freezes unchanged verified bytes, discards staged failures, and can rebuild a blocked final candidate', async () => {
  const root = await createPublicationRoot();
  const brokenRoot = await createPublicationRoot();
  const blockedRoot = await createPublicationRoot();
  const fixture = buildFixture();

  try {
    const assessed = await assessCandidatePublication({
      publicationRoot: root.publicationRoot,
      candidate: fixture.candidate,
      privateSources: fixture.privateSources,
      archive: createFakeArchiveDependencies(),
    });
    assert.equal(assessed.ok, true);
    assert.deepEqual(assessed.checks, {
      secretScanVerified: true,
      internalManifestVerified: true,
      archiveVerified: true,
      receiptVerified: true,
    });
    assert.deepEqual(Object.keys(assessed.staged).sort(), ['checks', 'packageName']);
    assert.equal((await readdir(root.publicationRoot)).length, 1);

    const frozen = await freezeTask10Publication(assessed.staged);
    assert.deepEqual(frozen.checks, assessed.checks);
    assert.equal((await readdir(root.publicationRoot)).includes(`${EXPECTED_PACKAGE_NAME}.publication.json`), true);
    await assert.rejects(freezeTask10Publication(assessed.staged), /cannot freeze/i);
    await assert.rejects(discardTask10Publication(assessed.staged), /cannot discard/i);
    await assert.rejects(
      freezeTask10Publication({ packageName: EXPECTED_PACKAGE_NAME, checks: assessed.checks } as unknown as Parameters<typeof freezeTask10Publication>[0]),
      /cannot freeze/i,
    );

    const brokenAssessment = await assessCandidatePublication({
      publicationRoot: brokenRoot.publicationRoot,
      candidate: buildFixture().candidate,
      privateSources: fixture.privateSources,
      archive: createFakeArchiveDependencies({
        mutateMemberBytes: {
          'client-conclusion.json': new TextEncoder().encode('{"tampered":true}\n'),
        },
      }),
    });
    assert.equal(brokenAssessment.ok, false);
    assert.deepEqual(brokenAssessment.checks, {
      secretScanVerified: true,
      internalManifestVerified: true,
      archiveVerified: false,
      receiptVerified: false,
    });
    assert.deepEqual(await readdir(brokenRoot.publicationRoot), []);

    const blockedDecisionFixture = buildFixture({
      decision: {
        conclusion: 'blocked',
        reasonCodes: ['rebuild-blocked-reason'],
        missingEvidence: ['rebuild-blocked-missing'],
      },
    });
    const blockedAssessment = await assessCandidatePublication({
      publicationRoot: blockedRoot.publicationRoot,
      candidate: blockedDecisionFixture.candidate,
      privateSources: blockedDecisionFixture.privateSources,
      archive: createFakeArchiveDependencies(),
    });
    assert.equal(blockedAssessment.ok, true);
    const blockedPublication = await freezeTask10Publication(blockedAssessment.staged);
    assert.equal(blockedPublication.receipt.clientOwnedConclusion, 'blocked');
  } finally {
    await rm(root.tempParent, { recursive: true, force: true });
    await rm(brokenRoot.tempParent, { recursive: true, force: true });
    await rm(blockedRoot.tempParent, { recursive: true, force: true });
  }
});

test('Task 10 passed candidates with redactions do not stage or publish, but sanitized blocked rebuilds can assess and freeze', async () => {
  const root = await createPublicationRoot();
  const blockedRoot = await createPublicationRoot();
  const prohibitedCatalog = buildProhibitedCatalog({
    tokens: 'token=passed-secret-12345',
  });

  try {
    const passedFixture = buildFixture({
      decision: {
        conclusion: 'passed',
        reasonCodes: ['contains token=passed-secret-12345'],
        missingEvidence: [],
      },
      prohibitedCatalog,
    });
    assert.equal(passedFixture.candidate.checks.secretScanVerified, false);
    const passedAssessment = await assessCandidatePublication({
      publicationRoot: root.publicationRoot,
      candidate: passedFixture.candidate,
      privateSources: passedFixture.privateSources,
      archive: createFakeArchiveDependencies(),
    });
    assert.equal(passedAssessment.ok, false);
    assert.deepEqual(passedAssessment.checks, {
      secretScanVerified: false,
      internalManifestVerified: false,
      archiveVerified: false,
      receiptVerified: false,
    });
    assert.deepEqual(await readdir(root.publicationRoot), []);
    await assert.rejects(
      materializeWithFakeArchive({
        publicationRoot: root.publicationRoot,
        candidate: passedFixture.candidate,
        privateSources: passedFixture.privateSources,
      }),
      /secretScanVerified/i,
    );

    const blockedFixture = buildFixture({
      decision: {
        conclusion: 'blocked',
        reasonCodes: ['contains token=passed-secret-12345'],
        missingEvidence: ['contains token=passed-secret-12345'],
      },
      prohibitedCatalog,
    });
    assert.equal(blockedFixture.candidate.checks.secretScanVerified, true);
    const blockedAssessment = await assessCandidatePublication({
      publicationRoot: blockedRoot.publicationRoot,
      candidate: blockedFixture.candidate,
      privateSources: blockedFixture.privateSources,
      archive: createFakeArchiveDependencies(),
    });
    assert.equal(blockedAssessment.ok, true);
    const blockedPublication = await freezeTask10Publication(blockedAssessment.staged);
    assert.equal(blockedPublication.receipt.clientOwnedConclusion, 'blocked');
  } finally {
    await rm(root.tempParent, { recursive: true, force: true });
    await rm(blockedRoot.tempParent, { recursive: true, force: true });
  }
});

test('Task 10 staged discard and freeze never trust caller-provided paths or forged objects', async () => {
  const victimRoot = await createPublicationRoot();
  const victimFilePath = path.join(victimRoot.publicationRoot, 'victim.txt');

  try {
    await writeFile(victimFilePath, 'keep-me', 'utf8');
    const forgedStage = {
      packageName: EXPECTED_PACKAGE_NAME,
      checks: {
        secretScanVerified: true,
        internalManifestVerified: true,
        archiveVerified: true,
        receiptVerified: true,
      },
      packageDirectoryPath: victimRoot.publicationRoot,
      receiptPath: victimFilePath,
    } as unknown as Parameters<typeof discardTask10Publication>[0];
    await assert.rejects(discardTask10Publication(forgedStage), /cannot discard/i);
    await assert.rejects(freezeTask10Publication(forgedStage), /cannot freeze/i);
    assert.equal(await readFile(victimFilePath, 'utf8'), 'keep-me');
  } finally {
    await rm(victimRoot.tempParent, { recursive: true, force: true });
  }
});

test('Task 10 publication materialization writes exact paths, membership, hashes, receipt bindings, permissions, and deterministic bytes', async () => {
  const fixture = buildFixture();
  const firstRoot = await createPublicationRoot();
  const secondRoot = await createPublicationRoot();

  try {
    const first = await materializeWithFakeArchive({
      publicationRoot: firstRoot.publicationRoot,
      candidate: fixture.candidate,
      privateSources: fixture.privateSources,
    });
    const second = await materializeWithFakeArchive({
      publicationRoot: secondRoot.publicationRoot,
      candidate: fixture.candidate,
      privateSources: fixture.privateSources,
    });

    assert.equal(path.basename(first.packageDirectoryPath), EXPECTED_PACKAGE_NAME);
    assert.equal(first.packageDirectoryPath, path.join(firstRoot.publicationRoot, EXPECTED_PACKAGE_NAME));
    assert.equal(first.archivePath, path.join(firstRoot.publicationRoot, `${EXPECTED_PACKAGE_NAME}.tar.gz`));
    assert.equal(first.receiptPath, path.join(firstRoot.publicationRoot, `${EXPECTED_PACKAGE_NAME}.publication.json`));

    assert.deepEqual((await readdir(first.packageDirectoryPath)).sort(), PACKAGE_MEMBER_NAMES);
    assert.equal((await stat(first.packageDirectoryPath)).mode & 0o777, 0o700);
    assert.equal((await stat(first.archivePath)).mode & 0o777, 0o600);
    assert.equal((await stat(first.receiptPath)).mode & 0o777, 0o600);
    for (const memberName of PACKAGE_MEMBER_NAMES) {
      assert.equal((await stat(path.join(first.packageDirectoryPath, memberName))).mode & 0o777, 0o600);
    }

    const packageBytes = await readPackageBytes(first.packageDirectoryPath);
    const readmeText = new TextDecoder().decode(packageBytes.get('README.md')!);
    assert.deepEqual(
      readmeText.split('\n').filter((line) => line.startsWith('## ')),
      [
        '## Conclusion',
        '## Frozen identities',
        '## Command summary',
        '## Scenario summary',
        '## Secret review',
        '## Hashes',
        '## Non-claims',
      ],
    );
    assert.equal(readmeText.endsWith('\n'), true);
    assert.equal(readmeText.endsWith('\n\n'), false);
    const manifestText = new TextDecoder().decode(packageBytes.get('SHA256SUMS.txt')!);
    const manifestLines = manifestText.trimEnd().split('\n');
    assert.equal(manifestLines.length, 6);
    assert.deepEqual(manifestLines.map((line) => line.split('  ')[1]), [...TASK10_CONTENT_FILES, 'secret-review.json'].sort());
    assert.ok(manifestLines.every((line) => /^[0-9a-f]{64}  [^\n]+$/.test(line)));
    assert.equal(packageBytes.get('client-conclusion.json')!.at(-1), 0x0a);
    assert.equal(packageBytes.get('secret-review.json')!.at(-1), 0x0a);

    const receiptWire = JSON.parse(await readFile(first.receiptPath, 'utf8')) as unknown;
    const parsedReceipt = parseTask10PublicationReceiptWire(receiptWire);
    assert.equal(parsedReceipt.issue_url, TASK10_AUTHORITY.issueUrl);
    assert.equal(parsedReceipt.package_directory, `${PUBLICATION_ROOT_BASENAME}/${EXPECTED_PACKAGE_NAME}`);
    assert.equal(parsedReceipt.archive_path, `${PUBLICATION_ROOT_BASENAME}/${EXPECTED_PACKAGE_NAME}.tar.gz`);
    assert.equal(parsedReceipt.internal_hash_manifest, `${PUBLICATION_ROOT_BASENAME}/${EXPECTED_PACKAGE_NAME}/SHA256SUMS.txt`);
    assert.equal(parsedReceipt.conclusion_path, `${PUBLICATION_ROOT_BASENAME}/${EXPECTED_PACKAGE_NAME}/client-conclusion.json`);
    assert.deepEqual(parsedReceipt.non_claims, TASK10_NON_CLAIMS);
    assert.deepEqual(Object.values(parsedReceipt.validation), new Array(9).fill(true));
    assert.equal(parsedReceipt.archive_sha256, digestHex(await readFile(first.archivePath)));
    assert.equal(parsedReceipt.archive_size_bytes, (await stat(first.archivePath)).size);

    assert.deepEqual(first.checks, {
      secretScanVerified: true,
      internalManifestVerified: true,
      archiveVerified: true,
      receiptVerified: true,
    });
    assert.equal(first.validationMode, 'producer');
    assert.equal(first.privateSourceBytesReverified, true);

    assert.equal(digestHex(await readFile(first.archivePath)), digestHex(await readFile(second.archivePath)));
    assert.equal(digestHex(await readFile(first.receiptPath)), digestHex(await readFile(second.receiptPath)));
    assert.equal(digestHex(await readFile(path.join(first.packageDirectoryPath, 'README.md'))), digestHex(await readFile(path.join(second.packageDirectoryPath, 'README.md'))));

    const copiedRoot = await createPublicationRoot();
    try {
      const copiedPackageDirectory = path.join(copiedRoot.publicationRoot, EXPECTED_PACKAGE_NAME);
      const copiedArchivePath = path.join(copiedRoot.publicationRoot, `${EXPECTED_PACKAGE_NAME}.tar.gz`);
      const copiedReceiptPath = path.join(copiedRoot.publicationRoot, `${EXPECTED_PACKAGE_NAME}.publication.json`);
      await cp(first.packageDirectoryPath, copiedPackageDirectory, { recursive: true });
      await cp(first.archivePath, copiedArchivePath);
      await cp(first.receiptPath, copiedReceiptPath);
      const offline = await validateOfflinePublication({
        packageDirectoryPath: copiedPackageDirectory,
        archivePath: copiedArchivePath,
        receiptPath: copiedReceiptPath,
        archive: createFakeArchiveDependencies(),
      });
      assert.deepEqual(offline.checks, first.checks);
      assert.equal(offline.validationMode, 'offline');
      assert.equal(offline.privateSourceBytesReverified, false);
    } finally {
      await rm(copiedRoot.tempParent, { recursive: true, force: true });
    }
  } finally {
    await rm(firstRoot.tempParent, { recursive: true, force: true });
    await rm(secondRoot.tempParent, { recursive: true, force: true });
  }
});

test('Task 10 publication permits validated handle reuse across rows but still rejects duplicate handles within a single row and archive byte mismatches', async () => {
  const root = await createPublicationRoot();
  const { privateSources, scenarioRows } = buildPrivateSourceMap();
  const reusedHandle = scenarioRows[3]!.privateEvidenceHandles[0]!;
  const reusedAttestation = scenarioRows[3]!.privateEvidenceAttestations[0]!;
  const reusedRows = scenarioRows.map((row, index) => {
    if (index === 0 || index === 3 || index === 6) {
      return {
        ...row,
        privateEvidenceHandles: [reusedHandle],
        privateEvidenceAttestations: [{ ...reusedAttestation, verifiedAt: row.timestamp }],
      };
    }
    return row;
  });

  try {
    const reusableFixture = buildFixture({ scenarioRows: reusedRows, privateSources });
    const reusablePublication = await materializeWithFakeArchive({
      publicationRoot: root.publicationRoot,
      candidate: reusableFixture.candidate,
      privateSources: reusableFixture.privateSources,
    });
    assert.equal(reusablePublication.receipt.clientOwnedConclusion, reusableFixture.candidate.clientConclusion.conclusion);

    const duplicateWithinRow = reusedRows.map((row, index) => index === 0
      ? {
          ...row,
          privateEvidenceHandles: [reusedHandle, reusedHandle],
          privateEvidenceAttestations: [
            { ...reusedAttestation, verifiedAt: row.timestamp },
            { ...reusedAttestation, verifiedAt: row.timestamp },
          ],
        }
      : row);
    await assert.rejects(
      Promise.resolve().then(() => buildFixture({ scenarioRows: duplicateWithinRow, privateSources })),
      /duplicate|align/i,
    );

    const cleanRoot = await createPublicationRoot();
    try {
      const cleanFixture = buildFixture();
      await assert.rejects(
        materializeWithFakeArchive({
          publicationRoot: cleanRoot.publicationRoot,
          candidate: cleanFixture.candidate,
          privateSources: cleanFixture.privateSources,
          archive: createFakeArchiveDependencies({
            mutateMemberBytes: {
              'command-log.json': new TextEncoder().encode('{"archive":"mismatch"}\n'),
            },
          }),
        }),
        /archive/i,
      );
    } finally {
      await rm(cleanRoot.tempParent, { recursive: true, force: true });
    }
  } finally {
    await rm(root.tempParent, { recursive: true, force: true });
  }
});

test('Task 10 bounded exact reads allow large valid members and reject oversized members or archives', async () => {
  const root = await createPublicationRoot();
  const archiveRoot = await createPublicationRoot();
  const largeReason = 'r'.repeat(24 * 1024);

  try {
    const largeFixture = buildFixture({
      decision: {
        conclusion: 'blocked',
        reasonCodes: [largeReason],
        missingEvidence: [],
      },
    });
    const largePublication = await materializeWithFakeArchive({
      publicationRoot: root.publicationRoot,
      candidate: largeFixture.candidate,
      privateSources: largeFixture.privateSources,
    });
    assert.equal((await stat(path.join(largePublication.packageDirectoryPath, 'client-conclusion.json'))).size > 16 * 1024, true);

    const oversizedFixture = buildFixture({
      decision: {
        conclusion: 'blocked',
        reasonCodes: ['m'.repeat(2 * 1024 * 1024 + 64)],
        missingEvidence: [],
      },
    });
    const oversizedAssessment = await assessCandidatePublication({
      publicationRoot: archiveRoot.publicationRoot,
      candidate: oversizedFixture.candidate,
      privateSources: oversizedFixture.privateSources,
      archive: createFakeArchiveDependencies(),
    });
    assert.equal(oversizedAssessment.ok, false);
    assert.deepEqual(oversizedAssessment.checks, {
      secretScanVerified: true,
      internalManifestVerified: false,
      archiveVerified: false,
      receiptVerified: false,
    });

    await assert.rejects(
      materializeWithFakeArchive({
        publicationRoot: archiveRoot.publicationRoot,
        candidate: largeFixture.candidate,
        privateSources: largeFixture.privateSources,
        archive: createFakeArchiveDependencies({
          archiveBytesOverride: new TextEncoder().encode('x'.repeat(16 * 1024 * 1024 + 1)),
        }),
      }),
      /archiveVerified|archive/i,
    );
  } finally {
    await rm(root.tempParent, { recursive: true, force: true });
    await rm(archiveRoot.tempParent, { recursive: true, force: true });
  }
});

test('Task 10 publication sanitizes explicit prohibited values across all frozen families without disclosing matches', async () => {
  const injectedValues: Partial<Record<(typeof TASK10_PROHIBITED_VALUE_FAMILIES)[number], string>> = {
    'admin session ids': 'admin-session-SECRET-12345',
    'account session ids': 'account-session-SECRET-12345',
    passwords: 'password=super-secret-12345',
    tokens: 'token=top-secret-12345',
    'credential secret refs': 'credential_secret_ref=cred-secret-12345',
    'fixture credentials': 'fixture-credential-12345',
    'email addresses': 'private.person@example.invalid',
    'generated account identifiers': 'generated-account:task10-secret-12345',
    'request and response bodies': '{"request":"private-body-12345"}',
    'absolute local paths': '/Users/private/task10-secret-12345',
  };
  const privateFixture = buildPrivateSourceMap(injectedValues);
  const fixture = buildFixture({
    decision: {
      conclusion: 'blocked',
      reasonCodes: ['reason contains token=top-secret-12345'],
      missingEvidence: ['missing contains admin-session-SECRET-12345'],
    },
    prohibitedCatalog: privateFixture.prohibitedCatalog,
    scenarioRows: privateFixture.scenarioRows,
    privateSources: privateFixture.privateSources,
  });
  const root = await createPublicationRoot();

  try {
    const result = await materializeWithFakeArchive({
      publicationRoot: root.publicationRoot,
      candidate: fixture.candidate,
      privateSources: fixture.privateSources,
    });

    const packageBytes = await readPackageBytes(result.packageDirectoryPath);
    const allPackageText = [...packageBytes.values()].map((bytes) => new TextDecoder().decode(bytes)).join('\n');
    for (const family of TASK10_PROHIBITED_VALUE_FAMILIES) {
      const rawValue = injectedValues[family];
      assert.ok(rawValue, `expected injected value for ${family}`);
      assert.equal(allPackageText.includes(rawValue), false);
    }
    const secretReview = parseTask10SecretReviewWire(JSON.parse(new TextDecoder().decode(packageBytes.get('secret-review.json')!)) as unknown);
    assert.equal(fixture.candidate.clientConclusion.reasonCodes.some((value) => value.includes('top-secret-12345')), false);
    assert.equal(fixture.candidate.clientConclusion.missingEvidence.some((value) => value.includes('admin-session-SECRET-12345')), false);
    assert.equal(secretReview.status, 'passed');
    assert.equal(secretReview.candidate_status, fixture.candidate.clientConclusion.conclusion);
    assert.deepEqual(secretReview.scope.content_files, TASK10_CONTENT_FILES);
    assert.deepEqual(secretReview.scanned_files, TASK10_CONTENT_FILES);
    assert.deepEqual(secretReview.prohibited_value_families, TASK10_PROHIBITED_VALUE_FAMILIES);
    assert.equal(secretReview.raw_logs_published, false);
    assert.equal(secretReview.raw_producer_outputs_published, false);
    assert.equal(secretReview.scope.private_source_values_published, false);
    assert.equal(secretReview.findings.length, TASK10_PROHIBITED_VALUE_FAMILIES.length);
    for (const finding of secretReview.findings) {
      assert.equal(finding.count > 0, true);
      assert.equal(allPackageText.includes(finding.family), true);
      for (const rawValue of Object.values(injectedValues)) {
        assert.equal(rawValue ? finding.code.includes(rawValue) : false, false);
      }
    }
  } finally {
    await rm(root.tempParent, { recursive: true, force: true });
  }
});

test('Task 10 publication fails closed on archive verification failure and leaves no final receipt', async () => {
  const fixture = buildFixture();
  const root = await createPublicationRoot();

  try {
    await assert.rejects(
      materializeWithFakeArchive({
        publicationRoot: root.publicationRoot,
        candidate: fixture.candidate,
        privateSources: fixture.privateSources,
        archive: createFakeArchiveDependencies({
          listOverride: [
            { path: EXPECTED_PACKAGE_NAME, type: 'directory' },
            { path: `${EXPECTED_PACKAGE_NAME}/README.md`, type: 'file' },
          ],
        }),
      }),
      /archive|verification/i,
    );

    assert.deepEqual((await readdir(root.publicationRoot)).sort(), []);
  } finally {
    await rm(root.tempParent, { recursive: true, force: true });
  }
});

test('Task 10 producer validation requires exact private bytes, aligned handles, canonical attestations, and valid evidence refs', async () => {
  const fixture = buildFixture();
  const root = await createPublicationRoot();

  try {
    const result = await materializeWithFakeArchive({
      publicationRoot: root.publicationRoot,
      candidate: fixture.candidate,
      privateSources: fixture.privateSources,
    });

    const privateSourcesEntries = [...fixture.privateSources.entries()];
    const missingSources = new Map(privateSourcesEntries.slice(1));
    await assert.rejects(
      validateProducerPublication({
        packageDirectoryPath: result.packageDirectoryPath,
        archivePath: result.archivePath,
        receiptPath: result.receiptPath,
        archive: createFakeArchiveDependencies(),
        privateSources: missingSources,
      }),
      /missing/i,
    );

    const firstHandle = privateSourcesEntries[0]![0];
    const firstValue = privateSourcesEntries[0]![1];
    const badHashSources = new Map(fixture.privateSources);
    badHashSources.set(firstHandle, { sourceClass: firstValue.sourceClass, bytes: new TextEncoder().encode('wrong-private-bytes') });
    await assert.rejects(
      validateProducerPublication({
        packageDirectoryPath: result.packageDirectoryPath,
        archivePath: result.archivePath,
        receiptPath: result.receiptPath,
        archive: createFakeArchiveDependencies(),
        privateSources: badHashSources,
      }),
      /handle/i,
    );

    const badClassSources = new Map(fixture.privateSources);
    badClassSources.set(firstHandle, { sourceClass: 'runtime', bytes: firstValue.bytes });
    await assert.rejects(
      validateProducerPublication({
        packageDirectoryPath: result.packageDirectoryPath,
        archivePath: result.archivePath,
        receiptPath: result.receiptPath,
        archive: createFakeArchiveDependencies(),
        privateSources: badClassSources,
      }),
      /source class/i,
    );

    const scenarioMatrixPath = path.join(result.packageDirectoryPath, 'scenario-matrix.json');
    const scenarioMatrix = JSON.parse(await readFile(scenarioMatrixPath, 'utf8')) as { scenarios: Array<{ evidence_refs: string[]; private_evidence_handles: string[]; private_handle_attestations: Array<{ handle: string; verified_at: string }> }> };
    scenarioMatrix.scenarios[0]!.evidence_refs = ['https://example.invalid/not-allowlisted'];
    await writeFile(scenarioMatrixPath, `${JSON.stringify(scenarioMatrix, null, 2)}\n`, 'utf8');
    await rewriteManifestAndReceipt(result.packageDirectoryPath, result.receiptPath);
    await rewriteFakeArchiveFromPackage(result.packageDirectoryPath, result.archivePath, EXPECTED_PACKAGE_NAME);
    await assert.rejects(
      validateOfflinePublication({
        packageDirectoryPath: result.packageDirectoryPath,
        archivePath: result.archivePath,
        receiptPath: result.receiptPath,
        archive: createFakeArchiveDependencies(),
      }),
      /allowlisted/i,
    );
  } finally {
    await rm(root.tempParent, { recursive: true, force: true });
  }
});

test('Task 10 offline validation rejects mutated package files, manifest changes, receipt mismatches, and unsafe archive members', async () => {
  const fixture = buildFixture();
  const root = await createPublicationRoot();

  try {
    const result = await materializeWithFakeArchive({
      publicationRoot: root.publicationRoot,
      candidate: fixture.candidate,
      privateSources: fixture.privateSources,
    });

    const cases: Array<{
      name: string;
      mutate: (paths: { packageDirectoryPath: string; archivePath: string; receiptPath: string }) => Promise<void>;
      archive?: Task10ArchiveDependencies;
      pattern: RegExp;
    }> = [
      {
        name: 'modified conclusion after assembly',
        mutate: async ({ packageDirectoryPath }) => {
          const conclusion = JSON.parse(await readFile(path.join(packageDirectoryPath, 'client-conclusion.json'), 'utf8')) as { reason_codes: string[] };
          conclusion.reason_codes = ['tampered-reason'];
          await writeFile(path.join(packageDirectoryPath, 'client-conclusion.json'), `${JSON.stringify(conclusion, null, 2)}\n`, 'utf8');
        },
        pattern: /manifest|hash|invalid/i,
      },
      {
        name: 'self hashing manifest',
        mutate: async ({ packageDirectoryPath }) => {
          await writeFile(path.join(packageDirectoryPath, 'SHA256SUMS.txt'), `${'a'.repeat(64)}  SHA256SUMS.txt\n`, 'utf8');
        },
        pattern: /manifest/i,
      },
      {
        name: 'receipt boolean mismatch',
        mutate: async ({ receiptPath }) => {
          const receipt = JSON.parse(await readFile(receiptPath, 'utf8')) as { validation: { archive_verified: boolean } };
          receipt.validation.archive_verified = false;
          await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
        },
        pattern: /validation booleans/i,
      },
      {
        name: 'receipt conclusion does not cross-bind package conclusion',
        mutate: async ({ receiptPath }) => {
          const receipt = JSON.parse(await readFile(receiptPath, 'utf8')) as { client_owned_conclusion: 'passed' | 'blocked' };
          receipt.client_owned_conclusion = receipt.client_owned_conclusion === 'passed' ? 'blocked' : 'passed';
          await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
        },
        pattern: /conclusion/i,
      },
      {
        name: 'secret review candidate status does not cross-bind conclusion',
        mutate: async ({ packageDirectoryPath, receiptPath }) => {
          const secretReview = JSON.parse(await readFile(path.join(packageDirectoryPath, 'secret-review.json'), 'utf8')) as { candidate_status: 'passed' | 'blocked' };
          secretReview.candidate_status = secretReview.candidate_status === 'passed' ? 'blocked' : 'passed';
          await writeFile(path.join(packageDirectoryPath, 'secret-review.json'), `${JSON.stringify(secretReview, null, 2)}\n`, 'utf8');
          await rewriteManifestAndReceipt(packageDirectoryPath, receiptPath);
        },
        pattern: /candidate|conclusion/i,
      },
      {
        name: 'package name does not cross-bind fingerprint runStartedAt',
        mutate: async ({ packageDirectoryPath, receiptPath }) => {
          const fingerprint = JSON.parse(await readFile(path.join(packageDirectoryPath, 'client-fingerprint.json'), 'utf8')) as { run_started_at: string };
          fingerprint.run_started_at = '2026-07-19T01:02:04.000Z';
          await writeFile(path.join(packageDirectoryPath, 'client-fingerprint.json'), `${JSON.stringify(fingerprint, null, 2)}\n`, 'utf8');
          await rewriteManifestAndReceipt(packageDirectoryPath, receiptPath);
        },
        pattern: /package name|fingerprint|runStartedAt/i,
      },
      {
        name: 'archive root entry type inversion',
        mutate: async () => {},
        archive: {
          ...createFakeArchiveDependencies({
            listOverride: [
              { path: EXPECTED_PACKAGE_NAME, type: 'file' },
              ...PACKAGE_MEMBER_NAMES.map((memberName) => ({ path: `${EXPECTED_PACKAGE_NAME}/${memberName}`, type: 'file' as const })),
            ],
          }),
        },
        pattern: /archive/i,
      },
      {
        name: 'archive member directory type inversion',
        mutate: async () => {},
        archive: {
          ...createFakeArchiveDependencies({
            listOverride: [
              { path: EXPECTED_PACKAGE_NAME, type: 'directory' },
              { path: `${EXPECTED_PACKAGE_NAME}/README.md`, type: 'directory' },
              ...PACKAGE_MEMBER_NAMES.filter((memberName) => memberName !== 'README.md').map((memberName) => ({ path: `${EXPECTED_PACKAGE_NAME}/${memberName}`, type: 'file' as const })),
            ],
          }),
        },
        pattern: /archive/i,
      },
      {
        name: 'archive traversal member',
        mutate: async () => {},
        archive: createFakeArchiveDependencies({
          listOverride: [
            { path: EXPECTED_PACKAGE_NAME, type: 'directory' },
            { path: `${EXPECTED_PACKAGE_NAME}/../escape.txt`, type: 'file' },
          ],
        }),
        pattern: /unsafe/i,
      },
      {
        name: 'archive backslash member',
        mutate: async () => {},
        archive: createFakeArchiveDependencies({
          listOverride: [
            { path: EXPECTED_PACKAGE_NAME, type: 'directory' },
            { path: `${EXPECTED_PACKAGE_NAME}\\escape.txt`, type: 'file' },
          ],
        }),
        pattern: /unsafe/i,
      },
      {
        name: 'archive symlink member',
        mutate: async () => {},
        archive: createFakeArchiveDependencies({
          listOverride: [
            { path: EXPECTED_PACKAGE_NAME, type: 'directory' },
            { path: `${EXPECTED_PACKAGE_NAME}/README.md`, type: 'symlink' },
          ],
        }),
        pattern: /link|archive/i,
      },
    ];

    for (const testCase of cases) {
      const isolatedRoot = await createPublicationRoot();
      try {
        const isolatedPackageDirectoryPath = path.join(isolatedRoot.publicationRoot, EXPECTED_PACKAGE_NAME);
        const isolatedArchivePath = path.join(isolatedRoot.publicationRoot, `${EXPECTED_PACKAGE_NAME}.tar.gz`);
        const isolatedReceiptPath = path.join(isolatedRoot.publicationRoot, `${EXPECTED_PACKAGE_NAME}.publication.json`);
        await cp(result.packageDirectoryPath, isolatedPackageDirectoryPath, { recursive: true });
        await cp(result.archivePath, isolatedArchivePath);
        await cp(result.receiptPath, isolatedReceiptPath);
        await testCase.mutate({
          packageDirectoryPath: isolatedPackageDirectoryPath,
          archivePath: isolatedArchivePath,
          receiptPath: isolatedReceiptPath,
        });
        await assert.rejects(
          validateOfflinePublication({
            packageDirectoryPath: isolatedPackageDirectoryPath,
            archivePath: isolatedArchivePath,
            receiptPath: isolatedReceiptPath,
            archive: testCase.archive ?? createFakeArchiveDependencies(),
          }),
          testCase.pattern,
          testCase.name,
        );
      } finally {
        await rm(isolatedRoot.tempParent, { recursive: true, force: true });
      }
    }
  } finally {
    await rm(root.tempParent, { recursive: true, force: true });
  }
});

test('Task 10 publication refuses existing or symlinked output targets', async () => {
  const fixture = buildFixture();
  const existingRoot = await createPublicationRoot();
  const symlinkParent = await mkdtemp(path.join(os.tmpdir(), 'task10-symlink-parent-'));

  try {
    await mkdir(path.join(existingRoot.publicationRoot, EXPECTED_PACKAGE_NAME), { recursive: true });
    await assert.rejects(
      materializeWithFakeArchive({
        publicationRoot: existingRoot.publicationRoot,
        candidate: fixture.candidate,
        privateSources: fixture.privateSources,
      }),
      /exists/i,
    );

    const symlinkTarget = path.join(symlinkParent, 'real-target');
    const symlinkPath = path.join(symlinkParent, 'publication-root-link');
    await mkdir(symlinkTarget, { recursive: true });
    await symlink(symlinkTarget, symlinkPath);
    await assert.rejects(
      materializeWithFakeArchive({
        publicationRoot: symlinkPath,
        candidate: fixture.candidate,
        privateSources: fixture.privateSources,
      }),
      /symlink/i,
    );

    const archiveSymlinkRoot = await createPublicationRoot();
    try {
      const validFixture = buildFixture();
      const validPublication = await materializeWithFakeArchive({
        publicationRoot: archiveSymlinkRoot.publicationRoot,
        candidate: validFixture.candidate,
        privateSources: validFixture.privateSources,
      });
      const archiveTargetPath = validPublication.archivePath;
      const archiveLinkPath = path.join(archiveSymlinkRoot.publicationRoot, 'archive-link.tar.gz');
      await symlink(archiveTargetPath, archiveLinkPath);
      await assert.rejects(
        validateOfflinePublication({
          packageDirectoryPath: validPublication.packageDirectoryPath,
          archivePath: archiveLinkPath,
          receiptPath: validPublication.receiptPath,
          archive: createFakeArchiveDependencies(),
        }),
        /archive|symlink/i,
      );
      assert.equal((await stat(archiveTargetPath)).size > 0, true);
    } finally {
      await rm(archiveSymlinkRoot.tempParent, { recursive: true, force: true });
    }
  } finally {
    await rm(existingRoot.tempParent, { recursive: true, force: true });
    await rm(symlinkParent, { recursive: true, force: true });
  }
});

test('Task 10 publication rejects symlinked ancestry before chmod or writes and leaves target content and mode unchanged', async () => {
  const ancestryParent = await createPublicationRoot();
  const nestedRoot = path.join(ancestryParent.tempParent, 'real-ancestor');
  const symlinkRoot = path.join(ancestryParent.tempParent, 'linked-ancestor');
  const sentinelPath = path.join(nestedRoot, 'sentinel.txt');
  const fixture = buildFixture();

  try {
    await mkdir(nestedRoot, { recursive: true, mode: 0o700 });
    await writeFile(sentinelPath, 'sentinel-before', 'utf8');
    await chmod(sentinelPath, 0o600);
    const originalMode = (await stat(sentinelPath)).mode & 0o777;
    await symlink(nestedRoot, symlinkRoot);

    await assert.rejects(
      materializeWithFakeArchive({
        publicationRoot: path.join(symlinkRoot, PUBLICATION_ROOT_BASENAME),
        candidate: fixture.candidate,
        privateSources: fixture.privateSources,
      }),
      /symlink/i,
    );

    assert.equal(await readFile(sentinelPath, 'utf8'), 'sentinel-before');
    assert.equal((await stat(sentinelPath)).mode & 0o777, originalMode);
    assert.equal(await readdir(nestedRoot).then((entries) => entries.includes(PUBLICATION_ROOT_BASENAME)), false);
  } finally {
    await rm(ancestryParent.tempParent, { recursive: true, force: true });
  }
});

test('Task 10 archive inspection uses an immutable secure snapshot and detects snapshot mutation', async () => {
  const root = await createPublicationRoot();
  const mutationRoot = await createPublicationRoot();
  const fixture = buildFixture();
  let createdArchivePath: string | null = null;
  let listedArchivePath: string | null = null;

  try {
    const snapshotSafeArchive = createFakeArchiveDependencies({
      onListArchiveMembers(archivePath) {
        listedArchivePath = archivePath;
        if (createdArchivePath) {
          return writeFile(createdArchivePath, 'mutated-original-archive', 'utf8');
        }
      },
    });
    const originalArchiveDirectory = snapshotSafeArchive.archiveDirectory;
    snapshotSafeArchive.archiveDirectory = async (input) => {
      createdArchivePath = input.archivePath;
      await originalArchiveDirectory(input);
    };

    const safeAssessment = await assessCandidatePublication({
      publicationRoot: root.publicationRoot,
      candidate: fixture.candidate,
      privateSources: fixture.privateSources,
      archive: snapshotSafeArchive,
    });
    assert.equal(safeAssessment.ok, true);
    assert.equal(listedArchivePath !== null, true);
    assert.notEqual(listedArchivePath, createdArchivePath, 'listed archive path should differ from the original archive path');
    await discardTask10Publication(safeAssessment.staged);

    const snapshotMutationArchive = createFakeArchiveDependencies({
      onReadArchiveMember(archivePath) {
        return writeFile(archivePath, 'mutated-snapshot-archive', 'utf8');
      },
    });
    await assert.rejects(
      materializeTask10Publication({
        publicationRoot: mutationRoot.publicationRoot,
        candidate: fixture.candidate,
        privateSources: fixture.privateSources,
        archive: snapshotMutationArchive,
      }),
      /archive/i,
    );
    assert.deepEqual(await readdir(mutationRoot.publicationRoot), []);
  } finally {
    await rm(root.tempParent, { recursive: true, force: true });
    await rm(mutationRoot.tempParent, { recursive: true, force: true });
  }
});

test('Task 10 default tar adapter kills a hanging helper on timeout and leaves no receipt', async () => {
  const root = await createPublicationRoot();
  const fixture = buildFixture();
  const helperDirectory = await mkdtemp(path.join(await realpath(os.tmpdir()), 'task10-hanging-tar-'));
  const helperPath = path.join(helperDirectory, 'hanging-tar.js');

  try {
    await writeFile(helperPath, '#!/usr/bin/env node\nsetTimeout(() => {}, 60_000);\n', 'utf8');
    await chmod(helperPath, 0o700);
    await assert.rejects(
      materializeTask10Publication({
        publicationRoot: root.publicationRoot,
        candidate: fixture.candidate,
        privateSources: fixture.privateSources,
        archive: createDefaultTask10ArchiveDependencies({
          tarCommand: helperPath,
          timeoutMs: 50,
        }),
      }),
      /timed out/i,
    );
    assert.deepEqual(await readdir(root.publicationRoot), []);
  } finally {
    await rm(root.tempParent, { recursive: true, force: true });
    await rm(helperDirectory, { recursive: true, force: true });
  }
});

test('Task 10 default tar adapter disables macOS metadata when creating archives', async () => {
  const helperDirectory = await mkdtemp(path.join(await realpath(os.tmpdir()), 'task10-tar-env-'));
  const helperPath = path.join(helperDirectory, 'tar-env.js');
  const sourceDirectory = path.join(helperDirectory, 'package-root');
  const archivePath = path.join(helperDirectory, 'package-root.tar.gz');
  await mkdir(sourceDirectory);
  await writeFile(path.join(sourceDirectory, 'README.md'), 'safe\n', 'utf8');
  await writeFile(
    helperPath,
    `#!/usr/bin/env node
const fs = require('node:fs');
if (process.env.COPYFILE_DISABLE !== '1') process.exit(2);
const archiveIndex = process.argv.indexOf('-czf') + 1;
fs.writeFileSync(process.argv[archiveIndex], 'archive');
`,
    'utf8',
  );
  await chmod(helperPath, 0o700);

  try {
    const archive = createDefaultTask10ArchiveDependencies({ tarCommand: helperPath });
    await archive.archiveDirectory({
      sourceDirectory,
      archivePath,
      rootName: path.basename(sourceDirectory),
    });
    assert.equal((await stat(archivePath)).isFile(), true);
  } finally {
    await rm(helperDirectory, { recursive: true, force: true });
  }
});

test('Task 10 default tar adapter integration works when platform tar is available', async () => {
  if (!isTask10TarAvailable()) {
    return;
  }
  const fixture = buildFixture();
  const root = await createPublicationRoot();

  try {
    const archive = createDefaultTask10ArchiveDependencies();
    const result = await materializeTask10Publication({
      publicationRoot: root.publicationRoot,
      candidate: fixture.candidate,
      privateSources: fixture.privateSources,
      archive,
    });
    const packageEntry = await lstat(result.packageDirectoryPath);
    assert.equal(packageEntry.isDirectory(), true);
    assert.equal((await stat(result.archivePath)).size > 0, true);
  } finally {
    await rm(root.tempParent, { recursive: true, force: true });
  }
});
