import type { RequestContext, RunId, AgentId, AgentConfig, AgentBehaviourMode, KnownRunEvent } from "@vinhnt-sdk/schema";
import type { MessageContentPart } from "../model.js";
import type { ModelProvider } from "../model.js";
import type { SessionRuntimeState } from "../session/session-state.js";
import type { RunEventStore, SessionStore } from "../session/store.js";
import type { AgentRegistry } from "../agent/agent-registry.js";
import type { ToolDefinition } from "../tool/definitions.js";
import type { ToolRegistry } from "../tool/registry.js";
import type { ToolProviderRegistry } from "../tool/provider.js";
import type { PluginManager } from "../plugin.js";
import type { ConversationCompactor } from "../session/compaction.js";
import type { ContextRegistry } from "../system-context/types.js";

import type { SubAgentParams } from "../agent/agent-factory.js";
import type { DomainManifest } from "../tool/domain.js";
import type { TerminationPolicy } from "./termination.js";
import { wildcardMatch } from "@vinhnt-sdk/schema";
import { getBehaviourProfile } from "../agent/behaviour-profiles.js";
import type { EventBus } from "../event-bus/types.js";
import { DEFAULT_MAX_STEPS, DEFAULT_MAX_TOOL_CALLS_PER_STEP, DOOM_LOOP_THRESHOLD } from "./kernel-utils.js";
import { RunStateMachine } from "./run-state.js";
import type { RunState } from "./run-state.js";
import { PermissionGate } from "./permission-gate.js";
import { ModelCaller } from "./model-caller.js";
import { StepExecutor } from "./step-executor.js";
import { ToolSaga } from "./tool-saga.js";
import { CircuitBreaker } from "./circuit-breaker.js";
import { KernelError } from "./kernel-error.js";
import type { KernelErrorCode } from "./kernel-error.js";
import { runLoop as executeRunLoop } from "./run-loop.js";
import type { RunLoopDeps } from "./run-loop.js";
import {
  emitEvent as sessionEmit,
  addSessionMessage as sessionAddMessage,
  updateSessionOnComplete as sessionUpdateComplete,
  emitFail as sessionEmitFail,
  buildAgentIdentity,
  type KernelSessionDeps,
} from "./kernel-session.js";
import {
  runAgent as runSubAgent,
  runAgentsParallel as runSubAgentsParallel,
  createSubAgentAndRegister,
  type SubAgentRunnerDeps,
} from "./sub-agent-runner.js";
import type { AgentKernelConfig, RunHandle } from "./kernel-types.js";
export type { AgentKernelConfig, RunState, KernelErrorCode };
export { CircuitBreaker, CircuitBreakerOpenError, type CircuitState, type CircuitBreakerOptions } from "./circuit-breaker.js";
export { KernelError } from "./kernel-error.js";

/**
 * Core agent orchestration — run loop, permission gate, tool execution, sub-agent spawning.
 * Composition root for all run-time services. Each call to `run()` creates a tracked
 * run lifecycle with abort support and session integration.
 */
export class AgentKernel {
  private readonly modelCaller: ModelCaller;
  private readonly permissionGate: PermissionGate;
  private readonly stateMachine: RunStateMachine;
  private readonly store: RunEventStore;
  private readonly tools: ToolDefinition[] = [];
  private readonly domainManifests = new Map<string, DomainManifest>();
  private maxSteps: number;
  private maxTokens: number;
  private readonly maxToolCallsPerStep: number;
  private readonly compactor: ConversationCompactor | undefined;
  private readonly systemContext: ContextRegistry | undefined;
  private thinkingBudget: number;
  private readonly selfCorrectOnFailure: boolean;
  private readonly maxSelfCorrectAttempts: number;
  private readonly maxSubAgentDepth: number;
  private readonly sessionStore: SessionStore | undefined;
  private readonly agentRegistry: AgentRegistry | undefined;
  private readonly pluginManager: PluginManager | undefined;
  private readonly eventBus: EventBus | undefined;
  private sessionState: SessionRuntimeState | undefined;
  private readonly toolRegistry: ToolRegistry | undefined;
  private readonly toolProviderRegistry: ToolProviderRegistry | undefined;
  private readonly sessionTitleGenerator: ((prompt: string) => Promise<string>) | undefined;
  private saga: ToolSaga;
  private readonly stepExecutor: StepExecutor;
  private currentAgent: AgentConfig | undefined;
  private currentDepth = 0;
  private agentChain = new Set<AgentId>();
  private cachedTools: readonly ToolDefinition[] | null = null;
  private cachedToolsAgentId: string | undefined;
  private stepTimeout: number;
  private readonly doomLoopThreshold: number;
  private compactionThreshold: number | undefined;
  private readonly termination: TerminationPolicy | undefined;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly sessionDeps: KernelSessionDeps;
  private readonly subAgentDeps: SubAgentRunnerDeps;
  private readonly runSessionStates = new Map<RunId, SessionRuntimeState | undefined>();

  constructor(config: AgentKernelConfig) {
    this.store = config.store;
    this.maxSteps = config.maxSteps ?? DEFAULT_MAX_STEPS;
    this.maxToolCallsPerStep = config.maxToolCallsPerStep ?? DEFAULT_MAX_TOOL_CALLS_PER_STEP;
    this.compactor = config.compactor ?? undefined;
    this.systemContext = config.systemContext;
    this.thinkingBudget = config.thinkingBudget ?? 0;
    this.selfCorrectOnFailure = config.selfCorrectOnFailure ?? false;
    this.maxSelfCorrectAttempts = config.maxSelfCorrectAttempts ?? 3;
    this.maxSubAgentDepth = config.maxSubAgentDepth ?? 3;
    this.sessionStore = config.sessionStore;
    this.agentRegistry = config.agentRegistry;
    this.pluginManager = config.pluginManager;
    this.eventBus = config.eventBus;
    this.sessionState = config.sessionState;
    this.toolRegistry = config.toolRegistry;
    this.toolProviderRegistry = config.toolProviderRegistry;
    this.sessionTitleGenerator = config.sessionTitleGenerator;
    this.stepTimeout = config.stepTimeout ?? 120_000;
    this.doomLoopThreshold = config.doomLoopThreshold ?? DOOM_LOOP_THRESHOLD;
    this.compactionThreshold = config.compactionThreshold;
    this.termination = config.termination;
    this.circuitBreaker = config.circuitBreaker ?? (config.circuitBreakerOptions ? new CircuitBreaker(config.circuitBreakerOptions) : new CircuitBreaker());
    this.saga = new ToolSaga();
    this.stateMachine = new RunStateMachine();
    this.permissionGate = new PermissionGate({
      store: config.store,
      eventBus: config.eventBus,
      pluginManager: config.pluginManager,
      approvalStore: config.approvalStore,
      autoApprovalEnabled: config.autoApprovalEnabled,
    });
    if (config.globalPermissionRules) {
      this.permissionGate.setGlobalRules(config.globalPermissionRules);
    }
    if (config.permissionRiskDefaults) {
      this.permissionGate.setRiskOverrides(config.permissionRiskDefaults as Partial<Record<string, string>>);
    }
    if (config.topLevelPermissionRules) {
      this.permissionGate.setTopLevelRules(config.topLevelPermissionRules);
    }
    this.maxTokens = config.maxTokens ?? 4096;
    const maxTokens = this.maxTokens;
    const thinkingPrompt = config.thinkingPrompt ?? "Analyze the user's request and the conversation context. Think step by step about what needs to be done. Output your reasoning.";
    this.modelCaller = new ModelCaller({
      defaultModel: config.model,
      modelRegistry: config.modelRegistry,
      maxTokens,
      thinkingBudget: this.thinkingBudget,
      thinkingPrompt,
      pluginManager: config.pluginManager,
      emitEvent: (event, persist) => this.emitEvent(event, persist),
      modelForRun: (runId) => this.stateMachine.getModelForRun(runId),
      setModelForRun: (runId, model) => this.stateMachine.setModelForRun(runId, model),
      getAvailableTools: () => this.getAvailableTools(),
    });
    const self = this;
this.stepExecutor = new StepExecutor({
      store: { emitEvent: (event, persist) => this.emitEvent(event, persist) },
      addSessionMessage: (sid, role, content, extra) => this.addSessionMessage(sid, role, content, extra as { toolCallId?: string; tokens?: { input: number; output: number; reasoning?: number }; model?: string; cost?: number } | undefined),
      pluginManager: config.pluginManager,
      permissionGate: this.permissionGate,
      modelCaller: this.modelCaller,
      maxToolCallsPerStep: this.maxToolCallsPerStep,
      ...(config.maxConcurrentToolCalls !== undefined ? { maxConcurrentToolCalls: config.maxConcurrentToolCalls } : {}),
      maxSelfCorrectAttempts: this.maxSelfCorrectAttempts,
      selfCorrectOnFailure: this.selfCorrectOnFailure,
      doomLoopThreshold: this.doomLoopThreshold,
      ...(config.externalDirectoryAccess !== undefined ? { externalDirectoryAccess: config.externalDirectoryAccess } : {}),
      ...(config.workspaceRoot !== undefined ? { workspaceRoot: config.workspaceRoot } : {}),
      currentAgent: this.currentAgent,
      saga: this.saga,
      findTool: (name) => self.findTool(name),
      hasTool: (name) => self.hasTool(name),
    });
    if (config.tools) {
      this.tools = [...config.tools];
    }

    this.sessionDeps = {
      store: this.store,
      eventBus: this.eventBus,
      pluginManager: this.pluginManager,
      sessionStore: this.sessionStore,
      modelCaller: this.modelCaller,
      saga: this.saga,
      ...(config.noStore ? { noStore: true } : {}),
    };

    this.subAgentDeps = {
      agentRegistry: this.agentRegistry!,
      sessionState: this.sessionState,
      stateMachine: this.stateMachine,
      store: this.store,
      modelCaller: this.modelCaller,
      maxSubAgentDepth: this.maxSubAgentDepth,
      currentAgentRef: { get value() { return self.currentAgent; }, set value(v) { self.currentAgent = v; } },
      currentDepthRef: { get value() { return self.currentDepth; }, set value(v) { self.currentDepth = v; } },
      agentChainRef: { get value() { return self.agentChain; }, set value(v) { self.agentChain = v; } },
      sessionStateRef: {
        get value() { return self["sessionState"]; },
        set value(v) { self["sessionState"] = v; },
      },
      runFn: (prompt, ctx, sessionId, _agentOverride) => this.run(prompt, ctx, sessionId, undefined, _agentOverride),
    };
  }

  /** Register a tool definition for the agent to call. Invalidates tool cache. */
  registerTool(tool: ToolDefinition): void {
    if (this.toolRegistry) {
      this.toolRegistry.register(tool);
    } else {
      this.tools.push(tool);
    }
    this.cachedTools = null;
  }

  /** Register a named domain manifest (tool membership) for agent `domains` filtering. */
  registerDomain(manifest: DomainManifest): void {
    this.domainManifests.set(manifest.id, manifest);
    this.toolRegistry?.registerDomain(manifest);
    this.cachedTools = null;
  }

  /** Resolve the domain a tool belongs to, or undefined if it is a core tool. */
  private domainFor(toolId: string): string | undefined {
    const viaRegistry = this.toolRegistry?.domainFor(toolId);
    if (viaRegistry) return viaRegistry;
    for (const [domainId, manifest] of this.domainManifests) {
      if (manifest.tools.some((t) => t.id === toolId)) return domainId;
    }
    return undefined;
  }

  /** Resolve the manifest for a domain id, or undefined. */
  private manifestFor(domainId: string): DomainManifest | undefined {
    return (
      this.toolRegistry?.getDomains().find((m) => m.id === domainId) ??
      this.domainManifests.get(domainId)
    );
  }

  private emitEvent(event: Omit<KnownRunEvent, "sequence">, persist = true): Promise<void> {
    return sessionEmit(this.sessionDeps, event, persist);
  }

  private addSessionMessage(sid: string | undefined, role: string, content: string, extra?: { toolCallId?: string; tokens?: { input: number; output: number; reasoning?: number }; model?: string; cost?: number }): Promise<void> {
    return sessionAddMessage(this.sessionDeps, sid, role, content, extra);
  }

  private getAvailableTools(): readonly ToolDefinition[] {
    const agentId = this.currentAgent?.id;
    if (this.cachedTools && this.cachedToolsAgentId === agentId) {
      return this.cachedTools;
    }
    const caps = this.currentAgent?.capabilities?.tools;

    // Tool source priority: toolProviderRegistry > toolRegistry > tools[]
    let pool: readonly ToolDefinition[];
    if (this.toolProviderRegistry) {
      pool = this.toolProviderRegistry.getAllTools();
    } else {
      pool = this.toolRegistry?.list() ?? this.tools;
    }

    // Domain filter: if the agent declares `domains`, only show domain tools it
    // belongs to plus core tools (tools in no registered domain). Undefined
    // (legacy default) means no filtering — all tools visible. Per-domain
    // permission defaults (e.g. an MCP server set to "deny") remove the tool.
    const domains = this.currentAgent?.domains;
    if (domains !== undefined) {
      pool = pool.filter((t) => {
        const domain = this.domainFor(t.id);
        if (domain === undefined) return true; // core tool — always available
        if (!domains.includes(domain)) return false; // domain not mounted for this agent
        const defaults = this.manifestFor(domain)?.permissionDefaults;
        if (defaults) {
          const denied = defaults.some(
            (r) => r.effect === "deny" && wildcardMatch(r.action, t.id),
          );
          if (denied) return false;
        }
        return true;
      });
    }

    if (caps && caps.length > 0) {
      pool = pool.filter((t: ToolDefinition) => caps.some((c) => wildcardMatch(c, t.id)));
    }

    // Apply behaviour mode profile (if not "build" mode, profile rules restrict tools)
    const behaviourMode = this.currentAgent?.behaviourMode ?? "build";
    if (behaviourMode !== "build") {
      const profile = getBehaviourProfile(behaviourMode);
      pool = pool.filter((t) => {
        for (const rule of profile.rules) {
          if (wildcardMatch(rule.target, t.id)) {
            return rule.effect === "allow";
          }
        }
        return true; // no rule matches — fall through to permission gate
      });
    }

    const result = pool.filter((t) => {
      const perm = this.permissionGate.checkTool(t.id, t.risk, undefined, this.currentAgent);
      return perm.allowed || perm.needsApproval;
    });
    this.cachedTools = result;
    this.cachedToolsAgentId = agentId;
    return result;
  }

  private findTool(name: string): ToolDefinition | undefined {
    return this.getAvailableTools().find((t) => t.id === name);
  }

  /** Whether a tool is registered in the underlying pool (regardless of per-agent filtering). */
  private hasTool(name: string): boolean {
    if (this.toolProviderRegistry) {
      return this.toolProviderRegistry.hasTool(name);
    }
    const pool = this.toolRegistry?.list() ?? this.tools;
    return pool.some((t) => t.id === name);
  }

  /** Switch to a named agent from the registry. Syncs permissions. */
  async useAgent(agentId: AgentId): Promise<void> {
    if (!this.agentRegistry) throw new Error("No agent registry configured");
    const agent = await this.agentRegistry.get(agentId);
    if (!agent) throw new Error(`Agent '${agentId}' not found`);
    this.currentAgent = agent;
  }

  /** Directly set the active agent config (bypasses registry lookup). */
  setCurrentAgent(agent: AgentConfig): void {
    this.currentAgent = agent;
    this.cachedTools = null;
  }

  /** Create and register a new sub-agent from inline params. */
  async spawnAgent(params: SubAgentParams): Promise<AgentConfig> {
    if (!this.agentRegistry) throw new Error("No agent registry configured");
    const ref: { value: AgentConfig | undefined } = { value: this.currentAgent };
    return createSubAgentAndRegister(
      { agentRegistry: this.agentRegistry, currentAgentRef: ref },
      params,
    );
  }

  /** Current active agent config (if any). */
  getCurrentAgent(): AgentConfig | undefined {
    return this.currentAgent;
  }

  /** Switch the current agent's behaviour mode (build/plan/custom). Resets tool cache. */
  setBehaviourMode(mode: AgentBehaviourMode): void {
    if (!this.currentAgent) {
      this.currentAgent = {
        id: "default" as AgentId,
        profile: { name: "default", description: "Default agent" },
        capabilities: { streaming: true, thinking: false },
        behaviourMode: mode,
      };
    } else {
      this.currentAgent = { ...this.currentAgent, behaviourMode: mode };
    }
    this.cachedTools = null;
  }

  /** Toggle auto-approval at runtime (all tools approved without prompting). */
  setAutoApproval(enabled: boolean): void {
    this.permissionGate.setAutoApprovalEnabled(enabled);
  }

  /** Get the current agent's behaviour mode (defaults to "build"). */
  getBehaviourMode(): AgentBehaviourMode {
    return this.currentAgent?.behaviourMode ?? "build";
  }

  /** Underlying agent registry (for listing/searching agents). */
  getAgentRegistry(): AgentRegistry | undefined {
    return this.agentRegistry;
  }

  /** Underlying run event store (for audit/event sourcing). */
  getEventStore(): RunEventStore {
    return this.store;
  }

  /** Delegate a prompt to a named sub-agent. Returns the agent's response text. */
  async runAgent(agentId: AgentId, prompt: string, ctx: RequestContext, sessionId?: string): Promise<string> {
    if (!this.agentRegistry) throw new Error("No agent registry configured");
    return runSubAgent(this.subAgentDeps, agentId, prompt, ctx, sessionId);
  }

  /**
   * Start a new agent run. Creates a run ID, wires abort + session, and returns
   * a `RunHandle` (runId + completed promise + abort). The run loop executes
   * asynchronously — the promise resolves when the run finishes (or fails).
   */
  run(prompt: string, ctx: RequestContext, sessionId?: string, userContentParts?: readonly MessageContentPart[], agentOverride?: AgentConfig): RunHandle {
    const runId = crypto.randomUUID() as RunId;
    this.stateMachine.runIdStack.push(runId);
    try {
      const parentRunId = this.stateMachine.runIdStack.at(-2);
      const abort = this.stateMachine.createRun(runId, sessionId, parentRunId);
      if (!abort) {
        return {
          runId,
          completed: Promise.reject(new Error(`Session "${sessionId}" is busy — concurrent run rejected`)),
          abort: () => {},
        };
      }

      this.runSessionStates.set(runId, this.sessionState);

      const agent = agentOverride ?? this.currentAgent;
      if (agent) {
        this.modelCaller.resolveAgentModel(agent, runId);
      }

      // Build effective prompt with agent identity and system prompt
      const identity = buildAgentIdentity(agent);
      const systemPrompt = agent?.systemPrompt;
      const parts = [identity, systemPrompt, prompt].filter(Boolean);
      const effectivePrompt = parts.join("\n\n");

      // Per-run saga (no instance-level mutation)
      const runSaga = new ToolSaga();

      const promise = this.runLoop(effectivePrompt, runId, ctx, abort, sessionId, userContentParts, agentOverride, runSaga).finally(() => {
        this.stateMachine.runIdStack.pop();
        this.runSessionStates.delete(runId);
      });

      return {
        runId,
        completed: promise,
        abort: () => { abort.abort(); },
      };
    } catch (err) {
      this.stateMachine.runIdStack.pop();
      throw err;
    }
  }

  private getRunSession(runId: RunId): SessionRuntimeState | undefined {
    return this.runSessionStates.get(runId) ?? this.sessionState;
  }

  /** Run multiple sub-agents concurrently. Returns combined output. */
  async runAgentsParallel(
    tasks: Array<{ agentId: AgentId; prompt: string }>,
    ctx: RequestContext,
    sessionId?: string,
  ): Promise<string> {
    if (!this.agentRegistry) throw new Error("No agent registry configured");
    return runSubAgentsParallel(this.subAgentDeps, tasks, ctx, sessionId);
  }

  /** Start a run with error-safe wrapper — returns `{ ok, value }` or `{ ok: false, error }`. */
  runSafe(prompt: string, ctx: RequestContext, sessionId?: string, userContentParts?: readonly MessageContentPart[]) {
    try {
      const handle = this.run(prompt, ctx, sessionId, userContentParts);
      const safeCompleted = handle.completed.then(
        (v) => v,
        (err: unknown) => { throw err instanceof KernelError ? err : new KernelError("internal_error", err instanceof Error ? err.message : String(err), err instanceof Error ? err : undefined); },
      );
      return { ok: true as const, value: { ...handle, completed: safeCompleted } };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof KernelError ? err : new KernelError("internal_error", err instanceof Error ? err.message : String(err)),
      };
    }
  }

  /** Get the tool saga for inspecting completed tool calls and triggering rollbacks. */
  getSaga(): ToolSaga {
    return this.saga;
  }

  /** Get the circuit breaker for inspecting trip state and threshold. */
  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  /** Get the model caller for testing prompts against providers. */
  getModelCaller(): ModelCaller {
    return this.modelCaller;
  }

  /**
   * Hot-reload runtime-tunable settings without rebuilding the kernel.
   * Updates the default model, generation limits, permission rules and
   * risk overrides. New runs pick up the values immediately.
   */
  reconfigure(partial: Partial<Pick<AgentKernelConfig,
    "model" | "maxTokens" | "maxSteps" | "stepTimeout" | "thinkingBudget" | "thinkingPrompt" |
    "compactionThreshold" | "globalPermissionRules" | "permissionRiskDefaults" | "topLevelPermissionRules"
  >>): void {
    if (partial.model) {
      this.modelCaller.setDefaultModel(partial.model);
    }
    if (partial.maxTokens !== undefined) {
      this.maxTokens = partial.maxTokens;
      this.modelCaller.setRuntimeOptions({ maxTokens: partial.maxTokens });
    }
    if (partial.maxSteps !== undefined) {
      this.maxSteps = partial.maxSteps;
    }
    if (partial.stepTimeout !== undefined) {
      this.stepTimeout = partial.stepTimeout;
    }
    if (partial.thinkingBudget !== undefined) {
      this.thinkingBudget = partial.thinkingBudget;
      this.modelCaller.setRuntimeOptions({ thinkingBudget: partial.thinkingBudget });
    }
    if (partial.thinkingPrompt !== undefined) {
      this.modelCaller.setRuntimeOptions({ thinkingPrompt: partial.thinkingPrompt });
    }
    if (partial.compactionThreshold !== undefined) {
      this.compactionThreshold = partial.compactionThreshold;
    }
    if (partial.globalPermissionRules) {
      this.permissionGate.setGlobalRules(partial.globalPermissionRules);
    }
    if (partial.permissionRiskDefaults) {
      this.permissionGate.setRiskOverrides(partial.permissionRiskDefaults as Partial<Record<string, string>>);
    }
    if (partial.topLevelPermissionRules) {
      this.permissionGate.setTopLevelRules(partial.topLevelPermissionRules);
    }
    this.cachedTools = null;
  }

  /** Get the permission gate for evaluating permission rules. */
  getPermissionGate(): PermissionGate {
    return this.permissionGate;
  }

  /** Current state of a run (pending/running/completed/failed/cancelled). */
  getRunState(runId: RunId): RunState | undefined {
    return this.stateMachine.getState(runId);
  }

  /** Subscribe to run state transitions. Returns unsubscribe function. */
  onRunStateChange(listener: (runId: RunId, state: RunState) => void): () => void {
    return this.stateMachine.onStateChange(listener);
  }

  /** Send a user input string to a waiting run (e.g., approval response). */
  sendInput(runId: RunId, text: string): void {
    this.stateMachine.sendInput(runId, text);
  }

  /** Abort all currently running sessions. */
  cancelCurrentRun(): void {
    this.stateMachine.cancelAll();
  }

  private async runLoop(
    prompt: string, runId: RunId, ctx: RequestContext, runAbort: AbortController,
    sessionId?: string, userContentParts?: readonly { type: string; text?: string; image?: string; mimeType?: string }[],
    agentOverride?: AgentConfig,
    runSaga?: ToolSaga,
  ): Promise<void> {
    const runModel = this.modelCaller.getActiveModel(runId);
    const runSessionState = this.getRunSession(runId);
    const currentAgent = agentOverride ?? this.currentAgent;

    let judgeModel: ModelProvider | undefined;
    const evaluatorId = this.termination?.evaluatorAgent;
    if (evaluatorId && this.agentRegistry) {
      const evaluator = await this.agentRegistry.get(evaluatorId as AgentId);
      if (evaluator) judgeModel = this.modelCaller.resolveAgentModel(evaluator);
    }

    const runSagaInstance = runSaga ?? new ToolSaga();
    const prevAgent = this.stepExecutor.getCurrentAgent();
    this.stepExecutor.setCurrentAgent(currentAgent);

    const orchestratorDeps: RunLoopDeps = {
      modelCaller: this.modelCaller,
      permissionGate: this.permissionGate,
      stepExecutor: this.stepExecutor,
      saga: runSagaInstance,
      store: this.store,
      circuitBreaker: this.circuitBreaker,
      stateMachine: this.stateMachine,
      ...(this.pluginManager ? { pluginManager: this.pluginManager } : {}),
      ...(this.systemContext ? { systemContext: this.systemContext } : {}),
      ...(this.compactor ? { compactor: this.compactor } : {}),
      ...(this.sessionStore ? { sessionStore: this.sessionStore } : {}),
      ...(this.sessionTitleGenerator ? { sessionTitleGenerator: this.sessionTitleGenerator } : {}),
      maxSteps: this.maxSteps,
      maxTokens: this.maxTokens,
      thinkingBudget: this.thinkingBudget,
      stepTimeout: this.stepTimeout,
      compactionThreshold: this.compactionThreshold,
      ...(this.termination ? { termination: this.termination } : {}),
      ...(judgeModel ? { judgeModel } : {}),
      ...(currentAgent ? { currentAgent } : {}),
      addSessionMessage: (sid, role, content, extra) => this.addSessionMessage(sid, role, content, extra as { toolCallId?: string; tokens?: { input: number; output: number; reasoning?: number }; model?: string; cost?: number } | undefined),
    };

    try {
      await executeRunLoop(orchestratorDeps, {
        prompt, runId, ctx, runAbort,
        ...(sessionId !== undefined ? { sessionId } : {}),
        ...(userContentParts !== undefined ? { userContentParts } : {}),
        runModel,
        ...(runSessionState !== undefined ? { runSessionState } : {}),
        addSessionMessage: (sid, role, content, extra) => this.addSessionMessage(sid, role, content, extra as { toolCallId?: string; tokens?: { input: number; output: number; reasoning?: number }; model?: string; cost?: number } | undefined),
        emitEvent: (event, persist) => this.emitEvent(event as unknown as Omit<KnownRunEvent, "sequence">, persist),
        setState: (rid, state) => this.stateMachine.setState(rid, state as RunState),
        updateSessionOnComplete: (sid, rid, totalIn, totalOut, _steps, _status) =>
          this.updateSessionOnComplete(sid, rid, totalIn, totalOut, _steps, _status),
        emitFail: (rid, c, reason, steps, sid, totalIn, totalOut, dur) =>
          this.emitFail(rid, c, reason, steps, sid, totalIn, totalOut, dur),
      });
    } finally {
      this.stepExecutor.setCurrentAgent(prevAgent);
    }
  }

  private updateSessionOnComplete(sid: string | undefined, rid: RunId, totalIn: number, totalOut: number, _steps: number, _status: string): Promise<void> {
    return sessionUpdateComplete(this.sessionDeps, sid, rid, totalIn, totalOut);
  }

  private emitFail(rid: RunId, c: RequestContext, reason: string, steps: number, sid?: string, totalIn = 0, totalOut = 0, dur?: number): Promise<void> {
    return sessionEmitFail(this.sessionDeps, rid, c, reason, steps, sid, totalIn, totalOut, dur);
  }

}
