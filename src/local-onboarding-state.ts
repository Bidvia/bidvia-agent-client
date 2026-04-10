import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

export interface BidviaLocalOnboardingState {
  tenantId?: string;
  principalId?: string;
  companyId?: string;
  registrationId?: string;
  sessionId?: string;
  lastCompletedStep?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BidviaLocalOnboardingStateInput extends BidviaLocalOnboardingState {
  sessionId?: string;
  adminSessionId?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface ResolveLocalOnboardingStatePathOptions {
  env?: NodeJS.ProcessEnv;
  homeDirectory?: string;
}

export interface LocalOnboardingStateIoOptions extends ResolveLocalOnboardingStatePathOptions {
  path?: string;
}

export interface WriteLocalOnboardingStateResult {
  path: string;
  state: BidviaLocalOnboardingState;
}

export interface BidviaLocalOnboardingStateWarning {
  code: 'invalid-local-onboarding-state';
  path: string;
  message: string;
}

export interface ReadLocalOnboardingStateResult {
  state: BidviaLocalOnboardingState | null;
  warnings: BidviaLocalOnboardingStateWarning[];
}

function buildInvalidLocalOnboardingStateWarning(path: string): BidviaLocalOnboardingStateWarning {
  return {
    code: 'invalid-local-onboarding-state',
    path,
    message: 'Local onboarding state file is malformed JSON. Ignoring cached state for this command.',
  };
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isBidviaLocalOnboardingState(value: unknown): value is BidviaLocalOnboardingState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return isOptionalString(candidate.tenantId)
    && isOptionalString(candidate.principalId)
    && isOptionalString(candidate.companyId)
    && isOptionalString(candidate.registrationId)
    && isOptionalString(candidate.sessionId)
    && isOptionalString(candidate.lastCompletedStep)
    && isOptionalString(candidate.createdAt)
    && isOptionalString(candidate.updatedAt);
}

function buildPersistedLocalOnboardingState(
  state: BidviaLocalOnboardingStateInput,
): BidviaLocalOnboardingState {
  return {
    ...(state.tenantId === undefined ? {} : { tenantId: state.tenantId }),
    ...(state.principalId === undefined ? {} : { principalId: state.principalId }),
    ...(state.companyId === undefined ? {} : { companyId: state.companyId }),
    ...(state.registrationId === undefined ? {} : { registrationId: state.registrationId }),
    ...(state.sessionId === undefined ? {} : { sessionId: state.sessionId }),
    ...(state.lastCompletedStep === undefined ? {} : { lastCompletedStep: state.lastCompletedStep }),
    ...(state.createdAt === undefined ? {} : { createdAt: state.createdAt }),
    ...(state.updatedAt === undefined ? {} : { updatedAt: state.updatedAt }),
  };
}

export function resolveLocalOnboardingStatePath(
  options: ResolveLocalOnboardingStatePathOptions = {},
): string {
  const env = options.env ?? process.env;

  if (env.BIDVIA_STATE_PATH) {
    return env.BIDVIA_STATE_PATH;
  }

  return path.join(options.homeDirectory ?? homedir(), '.bidvia', 'onboarding-state.json');
}

function resolveLocalOnboardingStateIoPath(options: LocalOnboardingStateIoOptions = {}): string {
  return options.path ?? resolveLocalOnboardingStatePath(options);
}

export async function readLocalOnboardingState(
  options: LocalOnboardingStateIoOptions = {},
): Promise<BidviaLocalOnboardingState | null> {
  const result = await readLocalOnboardingStateWithDiagnostics(options);
  return result.state;
}

export async function readLocalOnboardingStateWithDiagnostics(
  options: LocalOnboardingStateIoOptions = {},
): Promise<ReadLocalOnboardingStateResult> {
  const filePath = resolveLocalOnboardingStateIoPath(options);

  try {
    const content = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(content) as unknown;

    if (!isBidviaLocalOnboardingState(parsed)) {
      return {
        state: null,
        warnings: [buildInvalidLocalOnboardingStateWarning(filePath)],
      };
    }

    return {
      state: parsed as BidviaLocalOnboardingState,
      warnings: [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        state: null,
        warnings: [],
      };
    }

    if (error instanceof SyntaxError) {
      return {
        state: null,
        warnings: [buildInvalidLocalOnboardingStateWarning(filePath)],
      };
    }

    throw error;
  }
}

export async function writeLocalOnboardingState(
  state: BidviaLocalOnboardingStateInput,
  options: LocalOnboardingStateIoOptions = {},
): Promise<WriteLocalOnboardingStateResult> {
  const filePath = resolveLocalOnboardingStateIoPath(options);
  const persistedState = buildPersistedLocalOnboardingState(state);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(persistedState, null, 2), 'utf8');

  return {
    path: filePath,
    state: persistedState,
  };
}
