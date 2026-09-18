/**
 * Workflow primitives for agent orchestration.
 *
 * Inspired by Google ADK workflow patterns.
 * Provides parallel, sequential, and conditional execution.
 *
 * @module workflow
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Workflow step result */
export interface StepResult<T = unknown> {
  readonly success: boolean;
  readonly output?: T;
  readonly error?: Error | undefined;
  readonly durationMs: number;
}

/** Workflow context passed to each step */
export interface WorkflowContext {
  readonly workflowId: string;
  readonly stepIndex: number;
  readonly metadata: Record<string, unknown>;
  /** Abort signal for cancellation */
  readonly signal?: AbortSignal | undefined;
}

/** A single workflow step */
export interface WorkflowStep<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  execute(input: TInput, ctx: WorkflowContext): Promise<TOutput>;
}

// ---------------------------------------------------------------------------
// Parallel Execution
// ---------------------------------------------------------------------------

/**
 * Execute multiple steps in parallel.
 *
 * @example
 * ```ts
 * const results = await parallel([
 *   { name: "fetch-user", execute: async () => getUser() },
 *   { name: "fetch-posts", execute: async () => getPosts() },
 * ]);
 * ```
 */
export async function parallel<T>(
  steps: WorkflowStep<unknown, T>[],
  ctx?: Partial<WorkflowContext>,
): Promise<StepResult<T>[]> {
  const workflowId = ctx?.workflowId ?? `parallel-${Date.now()}`;
  const metadata = ctx?.metadata ?? {};

  return Promise.all(
    steps.map((step, i) =>
      executeStep(step, undefined, {
        workflowId,
        stepIndex: i,
        metadata,
        signal: ctx?.signal,
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Sequential Execution
// ---------------------------------------------------------------------------

/**
 * Execute steps sequentially, passing output of one as input to the next.
 *
 * @example
 * ```ts
 * const result = await sequential([
 *   { name: "validate", execute: async (input) => validate(input) },
 *   { name: "process", execute: async (input) => process(input) },
 *   { name: "save", execute: async (input) => save(input) },
 * ], initialInput);
 * ```
 */
export async function sequential<TInput, TOutput>(
  steps: WorkflowStep<any, any>[],
  initialInput: TInput,
  ctx?: Partial<WorkflowContext>,
): Promise<StepResult<TOutput>> {
  const workflowId = ctx?.workflowId ?? `sequential-${Date.now()}`;
  const metadata = ctx?.metadata ?? {};

  let currentInput: any = initialInput;
  let totalDuration = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step) continue;

    const result = await executeStep(step, currentInput, {
      workflowId,
      stepIndex: i,
      metadata,
      signal: ctx?.signal,
    });

    totalDuration += result.durationMs;

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        durationMs: totalDuration,
      };
    }

    currentInput = result.output;
  }

  return {
    success: true,
    output: currentInput as TOutput,
    durationMs: totalDuration,
  };
}

// ---------------------------------------------------------------------------
// Conditional Execution
// ---------------------------------------------------------------------------

/** A conditional branch */
export interface ConditionalBranch<TInput = unknown, TOutput = unknown> {
  readonly condition: (input: TInput) => boolean | Promise<boolean>;
  readonly steps: WorkflowStep[];
  readonly name?: string;
}

/**
 * Execute steps conditionally based on input.
 *
 * @example
 * ```ts
 * const result = await conditional(input, [
 *   {
 *     condition: (input) => input.type === "admin",
 *     steps: [adminStep],
 *     name: "admin-path",
 *   },
 *   {
 *     condition: () => true,
 *     steps: [defaultStep],
 *     name: "default-path",
 *   },
 * ]);
 * ```
 */
export async function conditional<TInput, TOutput>(
  input: TInput,
  branches: ConditionalBranch<TInput, TOutput>[],
  ctx?: Partial<WorkflowContext>,
): Promise<StepResult<TOutput>> {
  const workflowId = ctx?.workflowId ?? `conditional-${Date.now()}`;
  const metadata = ctx?.metadata ?? {};

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    if (!branch) continue;

    const shouldRun = await branch.condition(input);
    if (shouldRun) {
      let currentInput: any = input;
      let totalDuration = 0;

      for (let j = 0; j < branch.steps.length; j++) {
        const step = branch.steps[j];
        if (!step) continue;

        const result = await executeStep(step, currentInput, {
          workflowId,
          stepIndex: j,
          metadata: { ...metadata, branch: branch.name ?? i },
          signal: ctx?.signal,
        });

        totalDuration += result.durationMs;

        if (!result.success) {
          return {
            success: false,
            error: result.error,
            durationMs: totalDuration,
          };
        }

        currentInput = result.output;
      }

      return {
        success: true,
        output: currentInput as TOutput,
        durationMs: totalDuration,
      };
    }
  }

  return {
    success: false,
    error: new Error("No matching branch"),
    durationMs: 0,
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function executeStep<T>(
  step: WorkflowStep<unknown, T>,
  input: unknown,
  ctx: WorkflowContext,
): Promise<StepResult<T>> {
  const start = Date.now();
  try {
    const output = await step.execute(input, ctx);
    return {
      success: true,
      output,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      durationMs: Date.now() - start,
    };
  }
}
