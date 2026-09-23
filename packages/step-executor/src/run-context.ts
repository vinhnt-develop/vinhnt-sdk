import type { AgentConfig, AgentId, RequestContext, RunId } from "@vinhnt-sdk/schema";
import type { ToolDefinition } from "@vinhnt-sdk/tools";
import type { ToolSaga } from "@vinhnt-sdk/tools";

/**
 * Selection as carried on `RequestContext.overrides` (zod-inferred).
 * Derived from RequestContext so assignments from `ctx.overrides.selection`
 * stay assignable under `exactOptionalPropertyTypes`.
 */
export type RunSelection = NonNullable<
  NonNullable<RequestContext["overrides"]>["selection"]
>;

/**
 * Mutable state that belongs to a single run — kept out of the kernel
 * instance so concurrent runs never share (and clobber) each other's
 * active agent, sub-agent depth, agent chain, tool cache or saga.
 */
export interface RunContext {
  /** The run this context belongs to. */
  readonly runId: RunId;
  /** Agent actively executing this run (may change during sub-agent traversal). */
  agent: AgentConfig | undefined;
  /** Current sub-agent nesting depth of this run. */
  depth: number;
  /** Agent ids already in this run's sub-agent call chain (cycle detection). */
  agentChain: Set<AgentId>;
  /** Per-run saga for tool compensation recording. */
  saga: ToolSaga;
  /** Per-run tool resolution cache, keyed by the agent it was built for. */
  cachedTools: readonly ToolDefinition[] | null;
  cachedToolsAgentId: AgentId | undefined;
  /** Per-run resource selection from `ctx.overrides.selection` (webui composer). */
  selection?: RunSelection | undefined;
}

/** Create a fresh per-run context. */
export function createRunContext(
  runId: RunId,
  agent: AgentConfig | undefined,
  saga: ToolSaga,
): RunContext {
  return {
    runId,
    agent,
    depth: 0,
    agentChain: new Set(),
    saga,
    cachedTools: null,
    cachedToolsAgentId: undefined,
  };
}
