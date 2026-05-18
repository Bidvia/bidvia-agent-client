import type { BidviaRegisteredAgentExecutionCommand } from './adapters.js';
import { BidviaClientTransportError } from './client.js';
import type { BidviaClient } from './client.js';
import type { BidviaClientContext } from './contracts.js';
import type {
  BidviaLocalOnboardingState,
  BidviaLocalOnboardingStateWarning,
} from './local-onboarding-state.js';
import {
  resolveLocalOnboardingStatePath,
  writeLocalOnboardingState,
} from './local-onboarding-state.js';
import {
  buildCliExecutionPreflight,
  buildCliMissingContextMessage,
  type BidviaExecutionOperatorPreflight,
} from './operator-ergonomics.js';
import {
  buildCliEffectiveContextSnapshot,
  buildCliOnboardingActionExecutionContext,
  buildCliPersistedOnboardingActionState,
  type BidviaCliOnboardingActionCommand,
} from './cli-runtime-context.js';
import {
  buildBidviaSurfaceRuntimeIdentityContext,
  runBidviaSurfaceCapability,
} from './runtime/surface-runtime.js';

type BidviaCliParsedArgsLike = {
  command: string;
  dryRun: boolean;
  input?: string;
  flagValues: Record<string, string | undefined>;
};

type BidviaCliStructuredFailureLike = {
  error: {
    code: string;
    command: string;
    message: string;
    validInputs?: string[];
    details?: string[];
    preflight?: BidviaExecutionOperatorPreflight;
    transport?: {
      name: string;
      code?: string;
      status?: number;
      responseBody?: unknown;
    };
    localState?: {
      path: string;
      operation: 'write';
      name: string;
      message: string;
      code?: string;
    };
  };
};

type BidviaCliExecutionCommandDefinitionLike = {
  helperKey?: string;
  capabilityKey?: string;
  buildInput: (now: string) => unknown;
  run: (client: BidviaClient, now: string) => Promise<unknown>;
};

type BidviaCliRuntimeDependencies = {
  createClient: (env?: NodeJS.ProcessEnv, contextOverride?: Partial<BidviaClientContext>) => BidviaClient;
  resolveExecutionContext: () => Partial<BidviaClientContext>;
  resolveProcessEnv: () => NodeJS.ProcessEnv;
  readLocalOnboardingState: () => Promise<BidviaLocalOnboardingState | null>;
  readLocalOnboardingStateWithDiagnostics?: () => Promise<{
    state: BidviaLocalOnboardingState | null;
    warnings: BidviaLocalOnboardingStateWarning[];
  }>;
  executionCommands: Partial<Record<BidviaRegisteredAgentExecutionCommand, BidviaCliExecutionCommandDefinitionLike>>;
  now: () => string;
  printJson: (value: unknown) => void;
};

type BidviaCliRuntimeDispatchCallbacks = {
  buildStructuredFailure: (
    command: string,
    code: string,
    message: string,
    extra?: Omit<BidviaCliStructuredFailureLike['error'], 'code' | 'command' | 'message'>,
  ) => BidviaCliStructuredFailureLike;
  printStructuredFailure: (failure: BidviaCliStructuredFailureLike) => number;
  resolveExecutionCommandRuntimeKeys: (
    command: BidviaRegisteredAgentExecutionCommand,
    executionCommand: BidviaCliExecutionCommandDefinitionLike,
  ) => { helperKey: string; capabilityKey: string };
};

type BidviaCliOnboardingActionDefinition = {
  helperKey: string;
  run: (
    client: BidviaClient,
    parsedArgs: BidviaCliParsedArgsLike,
    now: string,
  ) => Promise<unknown>;
};

const onboardingActionRequiredContextByCommand = {
  'create-provisional-agent': ['tenantId'],
  'query-provisional-agent': ['tenantId'],
  'claim-provisional-agent': ['tenantId', 'sessionId'],
} as const satisfies Record<BidviaCliOnboardingActionCommand, readonly ('tenantId' | 'sessionId')[]>;

export const onboardingActionCommandDefinitions = {
  'create-provisional-agent': {
    helperKey: 'createProvisionalAgent',
    run: (client, parsedArgs, now) => client.createProvisionalAgent({
      provisionalAgentRef: parsedArgs.flagValues['--provisional-agent-ref']!,
      now,
    }),
  },
  'query-provisional-agent': {
    helperKey: 'queryProvisionalAgent',
    run: (client, parsedArgs) => client.queryProvisionalAgent({
      provisionalAgentRef: parsedArgs.flagValues['--provisional-agent-ref']!,
    }),
  },
  'claim-provisional-agent': {
    helperKey: 'claimProvisionalAgent',
    run: (client, parsedArgs, now) => client.claimProvisionalAgent({
      provisionalAgentRef: parsedArgs.flagValues['--provisional-agent-ref']!,
      claimToken: parsedArgs.flagValues['--claim-token']!,
      now,
    }),
  },
} as const satisfies Record<BidviaCliOnboardingActionCommand, BidviaCliOnboardingActionDefinition>;

function buildLocalOnboardingStateIoOptions(env: NodeJS.ProcessEnv) {
  return {
    env,
  };
}

function buildLocalOnboardingStateWriteFailure(
  command: string,
  path: string,
  error: unknown,
  callbacks: BidviaCliRuntimeDispatchCallbacks,
) {
  const normalizedError = error instanceof Error
    ? error
    : new Error(String(error));
  const errorCode = (error as NodeJS.ErrnoException | undefined)?.code;

  return callbacks.buildStructuredFailure(
    command,
    'local-onboarding-state-error',
    `Failed to persist local onboarding state at ${path}.`,
    {
      details: ['local-onboarding-state'],
      localState: {
        path,
        operation: 'write',
        name: normalizedError.name,
        message: normalizedError.message,
        ...(errorCode === undefined ? {} : { code: errorCode }),
      },
    },
  );
}

async function readCliLocalOnboardingState(
  dependencies: Pick<
    BidviaCliRuntimeDependencies,
    'readLocalOnboardingState' | 'readLocalOnboardingStateWithDiagnostics'
  >,
) {
  if (dependencies.readLocalOnboardingStateWithDiagnostics) {
    return dependencies.readLocalOnboardingStateWithDiagnostics();
  }

  return {
    state: await dependencies.readLocalOnboardingState(),
    warnings: [],
  };
}

function normalizeOnboardingActionTransportFailure(error: unknown) {
  if (error instanceof BidviaClientTransportError) {
    return {
      message: error.message,
      transport: {
        name: error.name,
        code: error.kind,
        ...(error.status === undefined ? {} : { status: error.status }),
        ...(error.responseBody === undefined ? {} : { responseBody: error.responseBody }),
      },
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      transport: {
        name: error.name,
      },
    };
  }

  return {
    message: String(error),
    transport: {
      name: 'UnknownError',
    },
  };
}

export async function runCliRuntimeOnboardingAction(
  command: string,
  parsedArgs: BidviaCliParsedArgsLike,
  dependencies: BidviaCliRuntimeDependencies,
  callbacks: BidviaCliRuntimeDispatchCallbacks,
): Promise<number | null> {
  const onboardingActionCommand = onboardingActionCommandDefinitions[
    command as BidviaCliOnboardingActionCommand
  ];
  if (!onboardingActionCommand) {
    return null;
  }

  const env = dependencies.resolveProcessEnv();
  const localOnboardingStateIoOptions = buildLocalOnboardingStateIoOptions(env);
  const localStateResult = await readCliLocalOnboardingState(dependencies);
  const localState = localStateResult.state;
  const effectiveContext = buildCliEffectiveContextSnapshot(env, localState);
  const now = dependencies.now();
  const executionContext = buildCliOnboardingActionExecutionContext(
    command as BidviaCliOnboardingActionCommand,
    env,
    localState,
    effectiveContext,
  );
  const requiredContext = onboardingActionRequiredContextByCommand[
    command as BidviaCliOnboardingActionCommand
  ];
  const missingContext = requiredContext.filter((contextKey) => {
    if (contextKey === 'tenantId') {
      return effectiveContext.tenantId.value === null;
    }

    return effectiveContext.sessionId.present === false;
  });

  if (missingContext.length > 0) {
    return callbacks.printStructuredFailure(
      callbacks.buildStructuredFailure(
        command,
        'missing-context',
        buildCliMissingContextMessage(command, missingContext),
        {
          details: [...missingContext],
        },
      ),
    );
  }

  let result: unknown;

  try {
    result = await runBidviaSurfaceCapability({
      transport: 'cli',
      helperKey: onboardingActionCommand.helperKey,
      capabilityKey: onboardingActionCommand.helperKey,
      identity: buildBidviaSurfaceRuntimeIdentityContext(executionContext),
      input: parsedArgs.flagValues,
      createClient: () => dependencies.createClient(env, executionContext),
      execute: async (client) => onboardingActionCommand.run(client, parsedArgs, now),
      now: dependencies.now,
      accumulation: { env },
    });
  } catch (error) {
    const normalizedFailure = normalizeOnboardingActionTransportFailure(error);
    return callbacks.printStructuredFailure(
      callbacks.buildStructuredFailure(
        command,
        'transport-error',
        normalizedFailure.message,
        {
          details: [normalizedFailure.transport.name],
          transport: normalizedFailure.transport,
        },
      ),
    );
  }

  try {
    await writeLocalOnboardingState(
      buildCliPersistedOnboardingActionState(
        command as BidviaCliOnboardingActionCommand,
        result,
        localState,
        effectiveContext,
        executionContext,
        now,
      ),
      localOnboardingStateIoOptions,
    );
  } catch (error) {
    return callbacks.printStructuredFailure(
      buildLocalOnboardingStateWriteFailure(
        command,
        resolveLocalOnboardingStatePath(localOnboardingStateIoOptions),
        error,
        callbacks,
      ),
    );
  }

  dependencies.printJson(
    localStateResult.warnings.length === 0
      ? result
      : {
        ...((typeof result === 'object' && result !== null) ? result as Record<string, unknown> : { result }),
        localStateWarnings: localStateResult.warnings,
      },
  );
  return 0;
}

export async function runCliRuntimeExecutionCommand(
  command: string,
  parsedArgs: BidviaCliParsedArgsLike,
  dependencies: BidviaCliRuntimeDependencies,
  callbacks: BidviaCliRuntimeDispatchCallbacks,
): Promise<number | null> {
  const executionCommand = dependencies.executionCommands[command as BidviaRegisteredAgentExecutionCommand];
  if (!executionCommand) {
    return null;
  }

  const runtimeKeys = callbacks.resolveExecutionCommandRuntimeKeys(
    command as BidviaRegisteredAgentExecutionCommand,
    executionCommand,
  );
  const preflight = buildCliExecutionPreflight(
    command,
    dependencies.resolveExecutionContext(),
    parsedArgs.dryRun,
  );

  if (parsedArgs.input) {
    return callbacks.printStructuredFailure(
      callbacks.buildStructuredFailure(
        command,
        'invalid-input',
        `The ${command} command does not accept --input. Use --dry-run to inspect the local-only payload preview.`,
      ),
    );
  }

  if (parsedArgs.dryRun) {
    const now = dependencies.now();
    dependencies.printJson({
      command,
      mode: 'dry-run',
      scope: 'local-only',
      preflight,
      input: executionCommand.buildInput(now),
    });
    return 0;
  }

  if (preflight && preflight.missingContext.length > 0) {
    return callbacks.printStructuredFailure(
      callbacks.buildStructuredFailure(
        command,
        'missing-context',
        buildCliMissingContextMessage(command, preflight.missingContext),
        {
          details: [...preflight.missingContext],
          preflight,
        },
      ),
    );
  }

  const env = dependencies.resolveProcessEnv();
  const now = dependencies.now();
  let result: unknown;

  try {
    result = await runBidviaSurfaceCapability({
      transport: 'cli',
      helperKey: runtimeKeys.helperKey,
      capabilityKey: runtimeKeys.capabilityKey,
      identity: buildBidviaSurfaceRuntimeIdentityContext(dependencies.resolveExecutionContext()),
      input: executionCommand.buildInput(now),
      createClient: () => dependencies.createClient(),
      execute: async (client) => executionCommand.run(client, now),
      now: dependencies.now,
      accumulation: { env },
    });
  } catch (error) {
    const normalizedFailure = normalizeOnboardingActionTransportFailure(error);
    return callbacks.printStructuredFailure(
      callbacks.buildStructuredFailure(
        command,
        'transport-error',
        normalizedFailure.message,
        {
          details: [normalizedFailure.transport.name],
          transport: normalizedFailure.transport,
        },
      ),
    );
  }

  dependencies.printJson(result);
  return 0;
}
