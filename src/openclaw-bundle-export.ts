import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildOpenClawConfig,
  exportOpenClawConfig,
} from './openclaw-config-export.js';

export interface BidviaOpenClawCompanionBundleFile {
  relativePath: string;
  content: string;
}

export interface BidviaOpenClawCompanionBundle {
  format: 'codex';
  supportedInstallTargets: ['local-path'];
  localOnly: true;
  files: [
    BidviaOpenClawCompanionBundleFile,
    BidviaOpenClawCompanionBundleFile,
    BidviaOpenClawCompanionBundleFile,
  ];
}

export interface BidviaOpenClawCompanionBundleWriteResult {
  outputPath: string;
  writtenFiles: string[];
}

function buildMcpConfigFile(): string {
  return JSON.stringify(exportOpenClawConfig(buildOpenClawConfig()), null, 2);
}

function buildCodexPluginFile(): string {
  return JSON.stringify({
    schemaVersion: '1.0',
    name: 'bidvia-openclaw-companion',
    description: 'Local-first Codex companion bundle for Bidvia OpenClaw packaging around the shared stdio MCP path.',
    mcpConfigPath: '.mcp.json',
    docs: [
      'docs/bidvia-openclaw-local-operator.md',
    ],
  }, null, 2);
}

function buildBootstrapContent(): string {
  return [
    '# Bidvia OpenClaw companion bootstrap',
    '',
    '- Use `bidvia mcp-server` as the installed local stdio MCP command.',
    '- OpenClaw stays packaging/config around that same local runtime path, not a separate Bidvia runtime surface.',
    '- This companion stays local-only and does not provide managed runtime or remote transport alternatives.',
    '- Bidvia tool tiers include review-safe reads and runtime-execution tools.',
    '- If required Bidvia context is missing, start with `route-context-matrix` to find the next context family.',
    '- Expect real governed routes to need values such as tenantId and principalId before execution succeeds.',
  ].join('\n');
}

export function buildOpenClawCompanionBundle(): BidviaOpenClawCompanionBundle {
  return {
    format: 'codex',
    supportedInstallTargets: ['local-path'],
    localOnly: true,
    files: [
      {
        relativePath: '.codex-plugin/plugin.json',
        content: buildCodexPluginFile(),
      },
      {
        relativePath: '.mcp.json',
        content: buildMcpConfigFile(),
      },
      {
        relativePath: 'docs/bidvia-openclaw-local-operator.md',
        content: buildBootstrapContent(),
      },
    ],
  };
}

export function exportOpenClawCompanionBundle(
  bundle: BidviaOpenClawCompanionBundle,
): BidviaOpenClawCompanionBundle {
  return structuredClone(bundle);
}

export async function writeOpenClawCompanionBundle(
  outputPath: string,
  bundle: BidviaOpenClawCompanionBundle = buildOpenClawCompanionBundle(),
): Promise<BidviaOpenClawCompanionBundleWriteResult> {
  if (outputPath.trim().length === 0) {
    throw new Error('output path is required for openclaw companion bundle export');
  }

  await mkdir(outputPath, { recursive: true });

  for (const file of bundle.files) {
    const filePath = path.join(outputPath, file.relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, file.content, 'utf8');
  }

  return {
    outputPath,
    writtenFiles: bundle.files.map((file) => file.relativePath),
  };
}
