import type { RequestContext, RunId, AgentId, AgentConfig, AgentBehaviourMode, KnownRunEvent, AgentEvent } from "@vinhnt-sdk/schema";
import { ValidationError, AgentNotFoundError } from "@vinhnt-sdk/schema";
import type { MessageContentPart } from "../model.js";
import type { ModelProvider } from "../model.js";
import type { SessionRuntimeState } from "../session/session-state.js";
import type { RunEventStore, SessionStore } from "../session/store.js";
import type { AgentRegistry } from "../agent/agent-registry.js";
import type { ToolDefinition, ToolRegistry, ToolProviderRegistry } from "@vinhnt-sdk/tools";
import type { PluginManager } from "../plugin.js";
import type { ConversationCompactor } from "../session/compaction.js";
import type { ContextRegistry } from "../system-context/types.js";
import { createRedactingLogger } from "@vinhnt-sdk/security";

import type { SubAgentParams } from "../agent/agent-factory.js";
import type { DomainManifest } from "@vinhnt-sdk/tools";
import type { TerminationPolicy } from "./termination.js";
import { wildcardMatch } from "@vinhnt-sdk/schema";
import { getBehaviourProfile } from "../agent/behaviour-profiles.js";
import type { EventBus } from "../event-bus/types.js";
import { DEFAULT_MAX_STEPS, DEFAULT_MAX_TOOL_CALLS_PER_STEP, DOOM_LOOP_THRESHOLD } from "./kernel-utils.js";

/** Default thinking prompt for reasoning steps. Exported for user override. */
export const DEFAULT_THINKING_PROMPT = "Analyze the user's request and the conversation context. Think step by step about what needs to be done. Output your reasoning.";

import { RunStateMachine } from "./run-state.js";
import type { RunState } from "./run-state.js";
import { PermissionGate, type ApprovalDecision } from "./permission-gate.js";
import { ModelCaller } from "./model-caller.js";
import { StepExecutor } from "./step-executor.js";
import { ToolSaga } from "./tool-saga.js";
import { createRunContext, type RunContext } from "./run-context.js";
import { CircuitBreaker } from "./circuit-breaker.js";
import { KernelError } from "./kernel-error.js";
import type { KernelErrorCode } from "./kernel-error.js";
import { runLoop as executeRunLoop } from "./run-loop.js";
import type { RunLoopDeps, RunLoopResult } from "./run-loop.js";
import { LifecycleManager, type LifecycleResource } from "./lifecycle-manager.js";
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
import type { AgentKernelConfig, RunHandle, AgentRunHandle, AgentRunResult } from "./kernel-types.js";
import { normalizeConfig } from "./kernel-types.js";
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
  private readonly runSagas = new Map<RunId, ToolSaga>();
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
  private circuitBreaker: CircuitBreaker;
  private readonly sessionDeps: KernelSessionDeps;
  private readonly subAgentDeps: SubAgentRunnerDeps;
  private readonly runSessionStates = new Map<RunId, SessionRuntimeState | undefined>();
  /** Per-run execution context — keeps parallel runs' agent/depth/chain/tools isolated. */
  private readonly runContexts = new Map<RunId, RunContext>();
  private readonly lifecycleManager: LifecycleManager;

  constructor(config: AgentKernelConfig) {
    const normalized = normalizeConfig(config as unknown as Record<string, unknown>);

    // Validate config values
    if (normalized.maxSteps !== undefined && normalized.maxSteps < 1) {
      throw new ValidationError("maxSteps must be >= 1");
    }
    if (normalized.maxTokens !== undefined && normalized.maxTokens < 1) {
      throw new ValidationError("maxTokens must be >= 1");
    }
    if (normalized.stepTimeout !== undefined && normalized.stepTimeout < 1000) {
      throw new ValidationError("stepTimeout must be >= 1000ms");
    }
    if (normalized.maxToolCallsPerStep !== undefined && normalized.maxToolCallsPerStep < 1) {
      throw new ValidationError("maxToolCallsPerStep must be >= 1");
    }
    if (normalized.doomLoopThreshold !== undefined && normalized.doomLoopThreshold < 1) {
      throw new ValidationError("doomLoopThreshold must be >= 1");
    }
    if (normalized.compactionThreshold !== undefined && (normalized.compactionThreshold < 0 || normalized.compactionThreshold > 1)) {
      throw new ValidationError("compactionThreshold must be between 0 and 1");
    }

    this.store = normalized.store;
    this.maxSteps = normalized.maxSteps ?? DEFAULT_MAX_STEPS;
    this.maxToolCallsPerStep = normalized.maxToolCallsPerStep ?? DEFAULT_MAX_TOOL_CALLS_PER_STEP;
    this.compactor = normalized.compactor ?? undefined;
    this.systemContext = normalized.systemContext;
    this.thinkingBudget = normalized.thinkingBudget ?? 0;
    this.selfCorrectOnFailure = normalized.selfCorrectOnFailure ?? false;
    this.maxSelfCorrectAttempts = normalized.maxSelfCorrectAttempts ?? 3;
    this.maxSubAgentDepth = normalized.maxSubAgentDepth ?? 3;
    this.sessionStore = normalized.sessionStore;
    this.agentRegistry = normalized.agentRegistry;
    this.pluginManager = normalized.pluginManager;
    this.eventBus = normalized.eventBus;
    this.sessionState = normalized.sessionState;
    this.toolRegistry = normalized.toolRegistry;
    this.toolProviderRegistry = normalized.toolProviderRegistry;
    this.sessionTitleGenerator = normalized.sessionTitleGenerator;
    this.stepTimeout = normalized.stepTimeout ?? 120_000;
    this.doomLoopThreshold = normalized.doomLoopThreshold ?? DOOM_LOOP_THRESHOLD;
    this.compactionThreshold = normalized.compactionThreshold;
    this.termination = normalized.termination;
    this.circuitBreaker = normalized.circuitBreaker ?? new CircuitBreaker({
      ...normalized.circuitBreakerOptions,
      maxRetries: normalized.maxRetries ?? normalized.circuitBreakerOptions?.maxRetries,
      backoffMs: normalized.retryBackoffMs ?? normalized.circuitBreakerOptions?.backoffMs,
      maxBackoffMs: normalized.maxRetryBackoffMs ?? normalized.circuitBreakerOptions?.maxBackoffMs,
    });
    this.saga = new ToolSaga();
    this.stateMachine = new RunStateMachine();
    this.permissionGate = new PermissionGate({
      store: normalized.store,
      eventBus: normalized.eventBus,
      pluginManager: normalized.pluginManager,
      approvalStore: normalized.permissions?.approvalStore,
      autoApprovalEnabled: normalized.permissions?.autoApprovalEnabled,
    });
    if (normalized.permissions?.globalPermissionRules) {
      this.permissionGate.setGlobalRules(normalized.permissions.globalPermissionRules);
    }
    if (normalized.permissions?.permissionRiskDefaults) {
      this.permissionGate.setRiskOverrides(normalized.permissions.permissionRiskDefaults as Partial<Record<string, ApprovalDecision>>);
    }
    if (normalized.permissions?.topLevelPermissionRules) {
      this.permissionGate.setTopLevelRules(normalized.permissions.topLevelPermissionRules);
    }
    this.maxTokens = normalized.maxTokens ?? 4096;
    const maxTokens = this.maxTokens;
    const thinkingPrompt = normalized.thinkingPrompt ?? DEFAULT_THINKING_PROMPT;
    // P1-N: wire the redacting logger into the kernel so every log line that
    // passes through it (e.g. model-caller diagnostics) is scrubbed of secrets.
    const rawLogger = normalized.logger;
    const redactingLogger = rawLogger
      ? {
          debug: createRedactingLogger(rawLogger.debug.bind(rawLogger)),
          info: createRedactingLogger(rawLogger.info.bind(rawLogger)),
          warn: createRedactingLogger(rawLogger.warn.bind(rawLogger)),
          error: createRedactingLogger(rawLogger.error.bind(rawLogger)),
        }
      : undefined;
    this.modelCaller = new ModelCaller({
      defaultModel: normalized.model,
      modelRegistry: normalized.modelRegistry,
      maxTokens,
      thinkingBudget: this.thinkingBudget,
      thinkingPrompt,
      pluginManager: normalized.pluginManager,
      logger: redactingLogger,
      emitEvent: (event, persist) => this.emitEvent(event, persist),
      modelForRun: (runId) => this.stateMachine.getModelForRun(runId),
      setModelForRun: (runId, model) => this.stateMachine.setModelForRun(runId, model),
      getAvailableTools: (runId) => this.getAvailableTools(runId),
    });
    const self = this;
this.stepExecutor = new StepExecutor({
      store: { emitEvent: (event, persist) => this.emitEvent(event, persist) },
      addSessionMessage: (sid, role, content, extra) => this.addSessionMessage(sid, role, content, extra as { toolCallId?: string; tokens?: { input: number; output: number; reasoning?: number }; model?: string; cost?: number } | undefined),
      pluginManager: normalized.pluginManager,
      permissionGate: this.permissionGate,
      modelCaller: this.modelCaller,
      maxToolCallsPerStep: this.maxToolCallsPerStep,
      ...(normalized.maxConcurrentToolCalls !== undefined ? { maxConcurrentToolCalls: normalized.maxConcurrentToolCalls } : {}),
      maxSelfCorrectAttempts: this.maxSelfCorrectAttempts,
      selfCorrectOnFailure: this.selfCorrectOnFailure,
      doomLoopThreshold: this.doomLoopThreshold,
      ...(normalized.permissions?.externalDirectoryAccess !== undefined ? { externalDirectoryAccess: normalized.permissions.externalDirectoryAccess } : {}),
      ...(normalized.workspaceRoot !== undefined ? { workspaceRoot: normalized.workspaceRoot } : {}),
      currentAgent: this.currentAgent,
      saga: this.saga,
      agentForRun: (runId) => this.runContexts.get(runId)?.agent,
      sagaForRun: (runId) => this.runContexts.get(runId)?.saga ?? this.saga,
      findTool: (name, runId) => self.findTool(name, runId),
      hasTool: (name) => self.hasTool(name),
    });
    if (normalized.tools) {
      this.tools = [...normalized.tools];
    }

    this.sessionDeps = {
      store: this.store,
      eventBus: this.eventBus,
      pluginManager: this.pluginManager,
      sessionStore: this.sessionStore,
      modelCaller: this.modelCaller,
      saga: this.saga,
      ...(normalized.noStore ? { noStore: true } : {}),
    };

    this.subAgentDeps = {
      agentRegistry: this.agentRegistry!,
      sessionState: this.sessionState,
      stateMachine: this.stateMachine,
      store: this.store,
      modelCaller: this.modelCaller,
      maxSubAgentDepth: this.maxSubAgentDepth,
      currentAgentRef: {
        get value() { return self.activeRunContext()?.agent ?? self.currentAgent; },
        set value(v) {
          const rc = self.activeRunContext();
          if (rc) { rc.agent = v; rc.cachedTools = null; rc.cachedToolsAgentId = undefined; }
          else { self.currentAgent = v; }
        },
      },
      currentDepthRef: {
        get value() { return self.activeRunContext()?.depth ?? self.currentDepth; },
        set value(v) {
          const rc = self.activeRunContext();
          if (rc) rc.depth = v;
          else self.currentDepth = v;
        },
      },
      agentChainRef: {
        get value() { return self.activeRunContext()?.agentChain ?? self.agentChain; },
        set value(v) {
          const rc = self.activeRunContext();
          if (rc) rc.agentChain = v;
          else self.agentChain = v;
        },
      },
      sessionStateRef: {
        get value() { return self["sessionState"]; },
        set value(v) { self["sessionState"] = v; },
      },
      runFn: (prompt, ctx, sessionId, _agentOverride) => this.run(prompt, ctx, sessionId, undefined, _agentOverride),
      runContextFor: (runId) => this.runContexts.get(runId),
    };

    this.lifecycleManager = new LifecycleManager();
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

  private getAvailableTools(runId?: RunId): readonly ToolDefinition[] {
    const rc = runId ? this.runContexts.get(runId) : undefined;
    const target = rc?.agent ?? this.currentAgent;
    const agentId = target?.id;
    const cachedTools = rc ? rc.cachedTools : this.cachedTools;
    const cachedToolsAgentId = rc ? rc.cachedToolsAgentId : this.cachedToolsAgentId;
    if (cachedTools && cachedToolsAgentId === agentId) {
      return cachedTools;
    }
    const caps = target?.capabilities?.tools;

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
    const domains = target?.domains;
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
    const behaviourMode = target?.behaviourMode ?? "build";
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
      const perm = this.permissionGate.checkTool(t.id, t.risk, undefined, target);
      return perm.allowed || perm.needsApproval;
    });
    if (rc) {
      rc.cachedTools = result;
      rc.cachedToolsAgentId = agentId;
    } else {
      this.cachedTools = result;
      this.cachedToolsAgentId = agentId;
    }
    return result;
  }

  private findTool(name: string, runId?: RunId): ToolDefinition | undefined {
    return this.getAvailableTools(runId).find((t) => t.id === name);
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
    if (!this.agentRegistry) throw new KernelError("internal_error", "No agent registry configured");
    const agent = await this.agentRegistry.get(agentId);
    if (!agent) throw new AgentNotFoundError(agentId);
    this.currentAgent = agent;
  }

  /** Directly set the active agent config (bypasses registry lookup). */
  setCurrentAgent(agent: AgentConfig): void {
    this.currentAgent = agent;
    this.cachedTools = null;
  }

  /** Create and register a new sub-agent from inline params. */
  async spawnAgent(params: SubAgentParams): Promise<AgentConfig> {
    if (!this.agentRegistry) throw new KernelError("internal_error", "No agent registry configured");
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
  async runAgent(agentId: AgentId, prompt: string, ctx: RequestContext, sessionId?: string, parentRunId?: RunId): Promise<string> {
    if (!this.agentRegistry) throw new KernelError("internal_error", "No agent registry configured");
    return runSubAgent(this.subAgentDeps, agentId, prompt, ctx, sessionId, parentRunId);
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

      const promise = this.runLoop(effectivePrompt, runId, ctx, abort, sessionId, userContentParts, agentOverride, runSaga)
        .then(() => undefined)
        .finally(() => {
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

  /**
   * Start a new agent run with full lifecycle management.
   * Returns an AgentRunHandle with cancel, status, and event streaming.
   * 
   * @example
   * ```typescript
   * const handle = kernel.createRunHandle("Write a hello world program", ctx);
   * 
   * // Wait for completion
   * const result = await handle.completed;
   * console.log(result.status); // "succeeded"
   * 
   * // Or cancel
   * handle.cancel();
   * 
   * // Stream events
   * for await (const event of handle.events()) {
   *   console.log(event.type);
   * }
   * ```
   */
  createRunHandle(
    prompt: string,
    ctx: RequestContext,
    sessionId?: string,
    userContentParts?: readonly MessageContentPart[],
    agentOverride?: AgentConfig,
  ): AgentRunHandle {
    const runId = crypto.randomUUID() as RunId;
    this.stateMachine.runIdStack.push(runId);
    
    let cancelled = false;
    let completed = false;
    let result: AgentRunResult | undefined;
    const eventHandlers = new Set<(event: AgentEvent) => void>();
    const abortController = new AbortController();
    
    const self = this;
    
    // Create the run promise
    const runPromise = (async () => {
      try {
        const parentRunId = this.stateMachine.runIdStack.at(-2);
        const abort = this.stateMachine.createRun(runId, sessionId, parentRunId);
        if (!abort) {
          throw new KernelError("session_busy", `Session "${sessionId}" is busy`);
        }
        // Wire the handle's cancel() into the controller the run loop listens on.
        abortController.signal.addEventListener("abort", () => abort.abort(), { once: true });

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

        // Emit agent.started event
        const startEvent: AgentEvent = {
          type: "agent.started",
          timestamp: new Date().toISOString(),
          runId,
          prompt,
          model: agent?.profile?.model,
        };
        eventHandlers.forEach(h => h(startEvent));

        // Run the loop — it reports its terminal status through the return value.
        const { totalSteps, status: runStatus } = await this.runLoop(effectivePrompt, runId, ctx, abort, sessionId, userContentParts, agentOverride, runSaga);

        completed = true;
        result = {
          runId,
          status: cancelled ? "cancelled" : runStatus === "failed" ? "failed" : "succeeded",
          totalSteps, // totalSteps from the run loop
        };

        // Emit agent.completed event
        const completeEvent: AgentEvent = {
          type: "agent.completed",
          timestamp: new Date().toISOString(),
          runId,
          status: result.status,
        };
        eventHandlers.forEach(h => h(completeEvent));

        return result;
      } catch (err) {
        completed = true;
        result = {
          runId,
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          totalSteps: 0,
        };

        // Emit agent.error event
        const errorEvent: AgentEvent = {
          type: "agent.error",
          timestamp: new Date().toISOString(),
          runId,
          error: result.error ?? "Unknown error",
          code: err instanceof KernelError ? err.code : undefined,
        };
        eventHandlers.forEach(h => h(errorEvent));

        throw err;
      } finally {
        this.stateMachine.runIdStack.pop();
        this.runSessionStates.delete(runId);
      }
    })();

    return {
      runId,
      completed: runPromise,
      cancel() {
        cancelled = true;
        abortController.abort();
      },
      get isCancelled() { return cancelled; },
      get isCompleted() { return completed; },
      get isRunning() { return !completed && !cancelled; },
      events() {
        return (async function* () {
          // Yield events as they occur
          const queue: AgentEvent[] = [];
          const handler = (event: AgentEvent) => queue.push(event);
          eventHandlers.add(handler);
          
          try {
            while (!completed) {
              if (queue.length > 0) {
                yield queue.shift()!;
              } else {
                await new Promise(r => setTimeout(r, 10));
              }
            }
            // Yield remaining events
            while (queue.length > 0) {
              yield queue.shift()!;
            }
          } finally {
            eventHandlers.delete(handler);
          }
        })();
      },
      onEvent(handler: (event: AgentEvent) => void) {
        eventHandlers.add(handler);
        return () => { eventHandlers.delete(handler); };
      },
    };
  }

  /**
   * Start a new agent run and stream events as an async iterable.
   * Returns the run ID and an async iterable of run events.
   */
  streamRun(
    prompt: string,
    ctx: RequestContext,
    sessionId?: string,
    userContentParts?: readonly MessageContentPart[],
    agentOverride?: AgentConfig,
  ): { runId: RunId; events: AsyncIterable<KnownRunEvent> } {
    const handle = this.run(prompt, ctx, sessionId, userContentParts, agentOverride);
    const eventBus = this.eventBus;
    const events = eventBus ? streamRunEvents(eventBus, handle.runId, handle.completed) : (async function* () {})();

    return {
      runId: handle.runId,
      events,
    };
  }

  private getRunSession(runId: RunId): SessionRuntimeState | undefined {
    return this.runSessionStates.get(runId) ?? this.sessionState;
  }

  /** Resolve the context of the most recently started run, if one is active. */
  private activeRunContext(): RunContext | undefined {
    const runId = this.stateMachine.runIdStack.at(-1);
    return runId ? this.runContexts.get(runId) : undefined;
  }

  /** Run multiple sub-agents concurrently. Returns combined output. */
  async runAgentsParallel(
    tasks: Array<{ agentId: AgentId; prompt: string }>,
    ctx: RequestContext,
    sessionId?: string,
    parentRunId?: RunId,
  ): Promise<string> {
    if (!this.agentRegistry) throw new KernelError("internal_error", "No agent registry configured");
    return runSubAgentsParallel(this.subAgentDeps, tasks, ctx, sessionId, parentRunId);
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
  getSaga(runId?: RunId): ToolSaga {
    if (runId) {
      const runSaga = this.runSagas.get(runId);
      if (runSaga) return runSaga;
    }
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
   *
   * Supports both nested format (`permissions: { ... }`) and legacy flat format
   * (`globalPermissionRules: ...`, `permissionRiskDefaults: ...`).
   */
  reconfigure(partial: Partial<Pick<AgentKernelConfig,
    "model" | "maxTokens" | "maxSteps" | "stepTimeout" | "thinkingBudget" | "thinkingPrompt" |
    "compactionThreshold" | "permissions" | "maxRetries" | "retryBackoffMs" | "maxRetryBackoffMs"
  >> & Record<string, unknown>): void {
    const normalized = normalizeConfig(partial as Record<string, unknown>);
    if (normalized.model) {
      this.modelCaller.setDefaultModel(normalized.model);
    }
    if (normalized.maxTokens !== undefined) {
      this.maxTokens = normalized.maxTokens;
      this.modelCaller.setRuntimeOptions({ maxTokens: normalized.maxTokens });
    }
    if (normalized.maxSteps !== undefined) {
      this.maxSteps = normalized.maxSteps;
    }
    if (normalized.stepTimeout !== undefined) {
      this.stepTimeout = normalized.stepTimeout;
    }
    if (normalized.thinkingBudget !== undefined) {
      this.thinkingBudget = normalized.thinkingBudget;
      this.modelCaller.setRuntimeOptions({ thinkingBudget: normalized.thinkingBudget });
    }
    if (normalized.thinkingPrompt !== undefined) {
      this.modelCaller.setRuntimeOptions({ thinkingPrompt: normalized.thinkingPrompt });
    }
    if (normalized.compactionThreshold !== undefined) {
      this.compactionThreshold = normalized.compactionThreshold;
    }
    if (normalized.maxRetries !== undefined || normalized.retryBackoffMs !== undefined || normalized.maxRetryBackoffMs !== undefined) {
      this.circuitBreaker = new CircuitBreaker({
        maxRetries: normalized.maxRetries ?? this.circuitBreaker.getOptions().maxRetries,
        backoffMs: normalized.retryBackoffMs ?? this.circuitBreaker.getOptions().backoffMs,
        maxBackoffMs: normalized.maxRetryBackoffMs ?? this.circuitBreaker.getOptions().maxBackoffMs,
      });
    }
    if (normalized.permissions?.globalPermissionRules) {
      this.permissionGate.setGlobalRules(normalized.permissions.globalPermissionRules);
    }
    if (normalized.permissions?.permissionRiskDefaults) {
      this.permissionGate.setRiskOverrides(normalized.permissions.permissionRiskDefaults as Partial<Record<string, ApprovalDecision>>);
    }
    if (normalized.permissions?.topLevelPermissionRules) {
      this.permissionGate.setTopLevelRules(normalized.permissions.topLevelPermissionRules);
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

  /** Register a lifecycle resource for graceful shutdown. */
  registerLifecycleResource(resource: LifecycleResource): void {
    this.lifecycleManager.register(resource);
  }

  /** Unregister a lifecycle resource. */
  unregisterLifecycleResource(id: string): void {
    this.lifecycleManager.unregister(id);
  }

  /** Gracefully shut down all registered lifecycle resources. */
  async shutdown(): Promise<{ success: string[]; failed: { id: string; error: unknown }[] }> {
    this.cancelCurrentRun();
    return this.lifecycleManager.shutdown();
  }

  private async runLoop(
    prompt: string, runId: RunId, ctx: RequestContext, runAbort: AbortController,
    sessionId?: string, userContentParts?: readonly { type: string; text?: string; image?: string; mimeType?: string }[],
    agentOverride?: AgentConfig,
    runSaga?: ToolSaga,
  ): Promise<RunLoopResult> {
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
    // Per-run context — the active agent, sub-agent depth/chain, saga and tool
    // cache all live here so parallel runs never clobber each other's state.
    const runContext = createRunContext(runId, currentAgent, runSagaInstance);
    this.runContexts.set(runId, runContext);
    // Point the run's recorder at this run's saga so that
    // record()/registerCompensation()/rollbackStep() operate on the same instance.
    this.runSagas.set(runId, runSagaInstance);

    // Per-run circuit breaker — parallel runs must not share breaker state, so
    // each run retries/trips independently. The instance breaker stays as the
    // default config (exposed via getCircuitBreaker()) for new runs.
    const runCircuitBreaker = new CircuitBreaker(this.circuitBreaker.getOptions());

    const orchestratorDeps: RunLoopDeps = {
      modelCaller: this.modelCaller,
      permissionGate: this.permissionGate,
      stepExecutor: this.stepExecutor,
      saga: runSagaInstance,
      store: this.store,
      circuitBreaker: runCircuitBreaker,
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
      const result = await executeRunLoop(orchestratorDeps, {
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
      return result;
    } finally {
      // Drop this run's context and saga — parallel runs each own their own.
      this.runContexts.delete(runId);
      this.runSagas.delete(runId);
    }
  }

  private updateSessionOnComplete(sid: string | undefined, rid: RunId, totalIn: number, totalOut: number, _steps: number, _status: string): Promise<void> {
    return sessionUpdateComplete(this.sessionDeps, sid, rid, totalIn, totalOut);
  }

  private emitFail(rid: RunId, c: RequestContext, reason: string, steps: number, sid?: string, totalIn = 0, totalOut = 0, dur?: number): Promise<void> {
    return sessionEmitFail(this.sessionDeps, rid, c, reason, steps, sid, totalIn, totalOut, dur);
  }

}

/**
 * Stream the events of a single run from the event bus, filtered by run ID.
 * Subscribes eagerly so no event published before the first `next()` is missed.
 * Terminates when the run completes (or fails).
 */
function streamRunEvents(
  eventBus: EventBus,
  runId: RunId,
  completed: Promise<unknown>,
): AsyncIterable<KnownRunEvent> {
  const queue: KnownRunEvent[] = [];
  let notify: (() => void) | null = null;
  let done = false;

  const wake = () => {
    const r = notify;
    notify = null;
    if (r) r();
  };

  const unsubscribe = eventBus.subscribeAll((event) => {
    if (event.aggregateId !== runId) return;
    queue.push(event as unknown as KnownRunEvent);
    wake();
  });
  completed.then(wake, wake);

  return {
    [Symbol.asyncIterator]() {
      const self = this;
      return {
        async next() {
          while (!done) {
            if (queue.length > 0) {
              return { done: false, value: queue.shift()! };
            }
            const stopped = await Promise.race([
              new Promise<boolean>((resolve) => { notify = () => resolve(false); }),
              completed.then(() => true, () => true),
            ]);
            if (stopped) done = true;
          }
          unsubscribe();
          // Drain any events that arrived after the run completed
          if (queue.length > 0) {
            return { done: false, value: queue.shift()! };
          }
          return { done: true, value: undefined };
        },
        return() {
          unsubscribe();
          return Promise.resolve({ done: true, value: undefined });
        },
        [Symbol.asyncIterator]() {
          return self;
        },
      };
    },
  };
}
