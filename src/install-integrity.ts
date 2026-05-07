import path from 'node:path';
import { fileURLToPath } from 'node:url';
import packageJson from '../package.json' with { type: 'json' };

import {
  buildInstallIntegrityReport,
  type BidviaInstallIntegrityReport,
} from './contracts.js';

export interface BidviaInstallIntegritySnapshotOptions {
  activeExecutablePath?: string;
  packageRoot?: string;
  packageVersion?: string | null;
  npmGlobalPrefix?: string | null;
}

function resolveDefaultPackageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function resolveDefaultActiveExecutablePath(packageRoot: string): string {
  const argvEntry = process.argv[1];
  if (argvEntry) {
    return path.resolve(argvEntry);
  }

  return path.join(packageRoot, 'dist', 'cli.js');
}

function normalizePath(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  return path.resolve(value);
}

function isWithinPath(candidatePath: string, parentPath: string): boolean {
  const relativePath = path.relative(parentPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function buildInstallIntegritySnapshot(
  options: BidviaInstallIntegritySnapshotOptions = {},
): BidviaInstallIntegrityReport {
  const resolvedPackageRoot = normalizePath(options.packageRoot) ?? resolveDefaultPackageRoot();
  const activeExecutablePath = normalizePath(options.activeExecutablePath)
    ?? resolveDefaultActiveExecutablePath(resolvedPackageRoot);
  const resolvedDistRoot = path.join(resolvedPackageRoot, 'dist');
  const packageVersion = options.packageVersion
    ?? (typeof packageJson.version === 'string' ? packageJson.version : null);
  const npmGlobalPrefix = normalizePath(options.npmGlobalPrefix);
  const driftSignals: string[] = [];

  if (!isWithinPath(activeExecutablePath, resolvedPackageRoot)) {
    driftSignals.push('active-binary-outside-package-root');
  }

  if (npmGlobalPrefix && !isWithinPath(activeExecutablePath, npmGlobalPrefix)) {
    driftSignals.push('active-binary-outside-npm-prefix');
  }

  return buildInstallIntegrityReport({
    command: 'install-integrity',
    scope: 'local-only',
    activeExecutablePath,
    resolvedPackageRoot,
    resolvedDistRoot,
    packageName: '@bidvia/client',
    packageVersion,
    pathDriftDetected: driftSignals.length > 0,
    driftSignals,
    blockerKind: driftSignals.length > 0 ? 'install-path-mismatch' : null,
    recommendedNextStep: driftSignals.length > 0
      ? 'Reinstall or relink the active bidvia binary so it points at the intended package root before rerunning runtime validation.'
      : null,
  });
}
