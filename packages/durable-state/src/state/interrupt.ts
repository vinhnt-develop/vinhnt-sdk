import { GraphInterrupt } from "../errors.js";

/**
 * A Command returned by a node or passed to resume a graph.
 *
 * Commands combine state updates with control-flow instructions:
 * - `resume` — provide the value an interrupted node is waiting for
 * - `update` — apply state changes before continuing
 * - `goto` — jump to a specific node
 * - `graph` — navigate to a parent graph (Command.PARENT) or subgraph
 *
 * @example
 * ```typescript
 * // Resume an interrupt with a value
 * const cmd = Command.resume("user approved");
 *
 * // Resume + update state + goto a node
 * const cmd = Command({
 *   resume: "approved",
 *   update: { step: 5 },
 *   goto: "next-node",
 * });
 * ```
 */
export interface Command<ResumeValue = unknown> {
  /** Resume value for an interrupt — if set, the graph continues from interrupt. */
  readonly resume?: ResumeValue;
  /** State delta to apply before continuing. */
  readonly update?: Record<string, unknown>;
  /** Node to jump to next. */
  readonly goto?: string;
  /** Navigate to parent graph (Command.PARENT) or a named subgraph. */
  readonly graph?: string | typeof Command.PARENT;
}

/**
 * Factory functions for creating {@link Command} instances.
 */
export const Command = {
  /** Special value to navigate from a subgraph back to its parent graph. */
  PARENT: "__parent__" as const,

  /** Create a resume command — continue from an interrupt with a value. */
  resume<Value = unknown>(value: Value): Command<Value> {
    return { resume: value };
  },

  /** Create a resume command with state update. */
  resumeWithUpdate<Value = unknown>(
    value: Value,
    update: Record<string, unknown>,
  ): Command<Value> {
    return { resume: value, update };
  },

  /** Create a resume command that jumps to a node. */
  resumeAndGoto<Value = unknown>(
    value: Value,
    goto: string,
  ): Command<Value> {
    return { resume: value, goto };
  },

  /** Create an update-only command (no resume). */
  update(update: Record<string, unknown>): Command {
    return { update };
  },

  /** Create a goto-only command. */
  goto(node: string): Command {
    return { goto: node };
  },
} as const;

/**
 * Result of calling interrupt() inside a node — never returns normally.
 * Thrown as GraphInterrupt to pause execution.
 */
export interface InterruptResult<Value = unknown> {
  readonly type: "interrupt";
  readonly value: Value;
  readonly interruptId: string;
}

/**
 * Pause graph execution at this point and wait for external input.
 *
 * The graph saves a checkpoint and throws GraphInterrupt. On resume with
 * `Command({ resume: value })`, the node that called interrupt() receives
 * `value` as its return value.
 *
 * @typeParam T - The type of value expected on resume.
 * @param value - The interrupt payload (what the UI shows to the user).
 * @param options - Interrupt options (nodeId, interruptId).
 * @returns Never returns — throws GraphInterrupt.
 *
 * @example
 * ```typescript
 * // Inside a node function:
 * const userChoice = interrupt("Approve this action?", { nodeId: "approval-node" });
 * // Execution pauses here. On resume:
 * //   const userChoice = "yes"; // value from Command({ resume: "yes" })
 * ```
 */
export function interrupt<T = unknown>(
  value: T,
  options?: { nodeId?: string; interruptId?: string },
): never {
  throw new GraphInterrupt(value, {
    nodeId: options?.nodeId,
    interruptId: options?.interruptId,
  }) as never;
}

/**
 * Type guard: is a value a Command?
 */
export function isCommand(value: unknown): value is Command {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    ("resume" in value || "update" in value || "goto" in value || "graph" in value)
  );
}

/**
 * Branded type for an interrupt id.
 */
export type InterruptId = string & { readonly __interruptBrand: unique symbol };

/**
 * Create a branded interrupt id.
 */
export function interruptId(id: string): InterruptId {
  return id as InterruptId;
}
