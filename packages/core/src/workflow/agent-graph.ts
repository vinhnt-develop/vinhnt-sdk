import type {
  Workflow,
  AnyWorkflowNode,
  ConditionNode,
  WorkflowEdge,
  WorkflowNodeResult,
  WorkflowResult,
} from "./types.js";
import type { AgentId, RequestContext } from "@vinhnt-sdk/schema";

export interface GraphExecutor {
  runAgent(agentId: AgentId, prompt: string, ctx: RequestContext): Promise<string>;
}

export interface GraphContext {
  readonly executor: GraphExecutor;
  readonly requestId: string;
  readonly traceId: string;
  /** actorId for the synthetic per-node RequestContext (default "workflow"). */
  readonly actorId?: string;
  /** tenantId for the synthetic per-node RequestContext (default "default"). */
  readonly tenantId?: string;
  /** Seed for the `{{input}}` variable (default ""). */
  readonly input?: string;
  /**
   * Checked before every node — aborts the remaining graph with a failed
   * result. Agent runs already in flight are not interrupted (the executor
   * owns its own cancellation).
   */
  readonly signal?: AbortSignal;
}

interface RunState {
  readonly vars: Map<string, string>;
  readonly memo: Map<string, Promise<string>>;
  readonly results: WorkflowNodeResult[];
  readonly active: Set<string>;
}

/**
 * Agent workflow graph (ADK/LangGraph-style topology).
 *
 * Execution model (G6.3 rewrite — edges are the source of truth):
 * - Edge-driven DFS: `agent`/`transform` nodes follow their outgoing edges
 *   sequentially; `condition` nodes choose `"true"`/`"false"`-labeled edges
 *   (falling back to inline `trueEdge`/`falseEdge`); `parallel` nodes fan out
 *   over their branch targets concurrently (each branch gets its own variable
 *   copy — no shared-state races) and continue along non-branch edges.
 * - Run-once memoization: a diamond join node executes exactly once (later
 *   arrivals await the first execution's result).
 * - Cycle detection: revisiting a node on the active path fails the workflow
 *   (`Cycle detected at node "…"`) instead of recursing forever.
 * - Conditions are typed predicate functions — never `eval`ed strings.
 * - `ctx.signal` is checked before each node.
 * - `execute()` never throws; validation/runtime errors surface as
 *   `{ status: "failed", error }`.
 */
export class AgentGraph {
  private readonly nodes = new Map<string, AnyWorkflowNode>();
  private readonly edges: WorkflowEdge[] = [];
  private entryNode: string | undefined;

  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly description?: string,
  ) {}

  /** Add a node to the graph. */
  addNode(node: AnyWorkflowNode): this {
    this.nodes.set(node.id, node);
    return this;
  }

  /** Add an edge between nodes. */
  addEdge(from: string, to: string, label?: string): this {
    this.edges.push({ from, to, ...(label !== undefined ? { label } : {}) });
    return this;
  }

  /** Set the entry node. */
  setEntry(nodeId: string): this {
    this.entryNode = nodeId;
    return this;
  }

  /** Build (and validate) the workflow definition. */
  build(): Workflow {
    if (this.entryNode === undefined) {
      throw new Error("Entry node not set");
    }
    if (!this.nodes.has(this.entryNode)) {
      throw new Error(`Entry node not found: ${this.entryNode}`);
    }
    for (const edge of this.edges) {
      if (!this.nodes.has(edge.from)) throw new Error(`Edge references unknown node: ${edge.from}`);
      if (!this.nodes.has(edge.to)) throw new Error(`Edge references unknown node: ${edge.to}`);
    }
    for (const node of this.nodes.values()) {
      if (node.type === "sequential") {
        for (const step of node.steps) {
          if (!this.nodes.has(step)) throw new Error(`Sequential node "${node.id}" references unknown node: ${step}`);
        }
      } else if (node.type === "parallel") {
        for (const branch of node.branches) {
          if (!this.nodes.has(branch)) throw new Error(`Parallel node "${node.id}" references unknown node: ${branch}`);
        }
      } else if (node.type === "condition") {
        if (!this.nodes.has(node.trueEdge)) throw new Error(`Condition node "${node.id}" trueEdge not found: ${node.trueEdge}`);
        if (!this.nodes.has(node.falseEdge)) throw new Error(`Condition node "${node.id}" falseEdge not found: ${node.falseEdge}`);
      }
    }
    return {
      id: this.id,
      name: this.name,
      ...(this.description !== undefined ? { description: this.description } : {}),
      entryNode: this.entryNode,
      nodes: [...this.nodes.values()],
      edges: [...this.edges],
    };
  }

  /** Execute the workflow — never throws; errors become `{status:"failed"}`. */
  async execute(ctx: GraphContext): Promise<WorkflowResult> {
    const startTime = Date.now();
    const state: RunState = {
      vars: new Map([["input", ctx.input ?? ""]]),
      memo: new Map(),
      results: [],
      active: new Set(),
    };
    try {
      const workflow = this.build();
      const finalOutput = await this.runNode(workflow.entryNode, ctx, state);
      return {
        workflowId: this.id,
        status: "completed",
        nodeResults: state.results,
        finalOutput,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        workflowId: this.id,
        status: "failed",
        nodeResults: state.results,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      };
    }
  }

  /** Memoized run-once entry: cycle check → shared promise → drive. */
  private runNode(nodeId: string, ctx: GraphContext, parent: RunState): Promise<string> {
    if (parent.active.has(nodeId)) {
      return Promise.reject(new Error(`Cycle detected at node "${nodeId}"`));
    }
    const existing = parent.memo.get(nodeId);
    if (existing !== undefined) return existing;
    const child: RunState = {
      vars: parent.vars,
      memo: parent.memo,
      results: parent.results,
      active: new Set(parent.active).add(nodeId),
    };
    const promise = this.drive(nodeId, ctx, child);
    parent.memo.set(nodeId, promise);
    return promise;
  }

  private async drive(nodeId: string, ctx: GraphContext, state: RunState): Promise<string> {
    const start = Date.now();
    const bail = (message: string): Error => {
      state.results.push({ nodeId, status: "failed", error: message, durationMs: Date.now() - start });
      return new Error(message);
    };
    if (ctx.signal?.aborted) throw bail("Workflow aborted");
    const node = this.nodes.get(nodeId);
    if (node === undefined) throw bail(`Node not found: ${nodeId}`);
    let own = "";
    try {
      switch (node.type) {
        case "agent": {
          const template = node.inputTemplate ?? "{{input}}";
          own = await ctx.executor.runAgent(node.agentId, this.interpolate(template, state.vars), this.requestContext(ctx));
          break;
        }
        case "transform": {
          own = this.interpolate(node.transform, state.vars);
          break;
        }
        case "sequential": {
          for (const stepId of node.steps) {
            own = await this.runNode(stepId, ctx, state);
            state.vars.set("prev.output", own);
          }
          break;
        }
        case "parallel": {
          const targets = this.parallelTargets(node);
          const outcomes = await Promise.allSettled(
            targets.map((target) => this.runNode(target, ctx, this.branchState(state))),
          );
          const failure = outcomes.find((o) => o.status === "rejected");
          if (failure !== undefined) throw (failure as PromiseRejectedResult).reason;
          own = outcomes.map((o) => (o as PromiseFulfilledResult<string>).value).join("\n---\n");
          break;
        }
        case "condition": {
          const chosen = await this.chooseSuccessor(node, state);
          own = await this.runNode(chosen, ctx, state);
          state.vars.set("prev.output", own);
          state.vars.set(nodeId, own);
          state.results.push({ nodeId, status: "completed", output: own, durationMs: Date.now() - start });
          return own;
        }
      }

      state.vars.set("prev.output", own);
      state.vars.set(nodeId, own);

      // Successors: agent/transform/sequential chain their outgoing edges
      // sequentially; parallel continues along non-branch (fan-in) edges only.
      // Failures below a node mark that node failed too (subtree semantics).
      let final = own;
      if (node.type === "parallel") {
        const targets = this.parallelTargets(node);
        for (const edge of this.outgoing(nodeId)) {
          if (targets.includes(edge.to)) continue;
          final = await this.runNode(edge.to, ctx, state);
        }
      } else {
        for (const edge of this.outgoing(nodeId)) {
          final = await this.runNode(edge.to, ctx, state);
        }
      }

      state.results.push({ nodeId, status: "completed", output: own, durationMs: Date.now() - start });
      return final;
    } catch (error) {
      state.results.push({
        nodeId,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      });
      throw error;
    }
  }

  private outgoing(nodeId: string): WorkflowEdge[] {
    return this.edges.filter((e) => e.from === nodeId);
  }

  private parallelTargets(node: Extract<AnyWorkflowNode, { type: "parallel" }>): string[] {
    if (node.branches.length > 0) return node.branches;
    return this.outgoing(node.id).map((e) => e.to);
  }

  private async chooseSuccessor(node: ConditionNode, state: RunState): Promise<string> {
    const labeled = this.outgoing(node.id);
    const trueEdge = labeled.find((e) => e.label === "true");
    const falseEdge = labeled.find((e) => e.label === "false");
    const passes = await node.condition(Object.fromEntries(state.vars));
    if (trueEdge !== undefined && falseEdge !== undefined) {
      return passes ? trueEdge.to : falseEdge.to;
    }
    return passes ? node.trueEdge : node.falseEdge;
  }

  private branchState(state: RunState): RunState {
    return {
      vars: new Map(state.vars),
      memo: state.memo,
      results: state.results,
      active: new Set(state.active),
    };
  }

  private requestContext(ctx: GraphContext): RequestContext {
    return {
      requestId: ctx.requestId,
      traceId: ctx.traceId,
      actorId: ctx.actorId ?? "workflow",
      tenantId: ctx.tenantId ?? "default",
    } as RequestContext;
  }

  private interpolate(template: string, variables: ReadonlyMap<string, string>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key: string) => variables.get(key) ?? `{{${key}}}`);
  }
}
