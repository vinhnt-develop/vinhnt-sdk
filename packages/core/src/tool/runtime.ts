import type { ToolDefinition, ToolContext } from "@vinhnt-sdk/tools";
import { ToolPermissionDenied } from "@vinhnt-sdk/schema";
import { ToolRegistry } from "@vinhnt-sdk/tools";
import { ToolSandbox, signalToToolContext } from "@vinhnt-sdk/tools";
import type { PermissionGate} from "@vinhnt-sdk/step-executor";
import { type DynamicRule } from "@vinhnt-sdk/step-executor";
import type { ApprovalHandler } from "@vinhnt-sdk/tools";

export type ToolExecutionResult =
  | { status: "success"; output: unknown }
  | { status: "denied"; reason: string }
  | { status: "error"; error: string };

export interface ToolHook {
  readonly id: string;
  pre?(params: { toolId: string; tool: ToolDefinition; input: unknown }): 
    Promise<{ input: unknown } | { denied: string } | null>;
  post?(params: { toolId: string; tool: ToolDefinition; input: unknown; result: ToolExecutionResult }): 
    Promise<ToolExecutionResult | null>;
}

export interface ToolRuntimeConfig {
  permissionGate?: PermissionGate;
  approvalHandler?: ApprovalHandler;
  sandbox?: ToolSandbox;
}

export class ToolRuntime {
  readonly registry = new ToolRegistry();
  private readonly permissionGate: PermissionGate | undefined;
  private readonly hasExplicitGate: boolean;
  private approvalHandler: ApprovalHandler | undefined;
  private readonly sandbox: ToolSandbox;
  private readonly hooks: ToolHook[] = [];

  constructor(config?: ToolRuntimeConfig) {
    this.hasExplicitGate = config?.permissionGate !== undefined;
    this.permissionGate = config?.permissionGate;
    this.approvalHandler = config?.approvalHandler;
    this.sandbox = config?.sandbox ?? new ToolSandbox();
  }

  /** Set or replace the approval handler at runtime */
  setApprovalHandler(handler: ApprovalHandler): void {
    this.approvalHandler = handler;
  }

  register(tool: ToolDefinition<unknown, unknown>): void {
    this.registry.register(tool);
  }

  getTools(): readonly ToolDefinition[] {
    return this.registry.list();
  }

  addHook(hook: ToolHook): void {
    this.hooks.push(hook);
  }

  removeHook(id: string): void {
    const idx = this.hooks.findIndex((h) => h.id === id);
    if (idx >= 0) this.hooks.splice(idx, 1);
  }

  /** Register a dynamic rule from an "always allow" approval */
  addDynamicRule(rule: DynamicRule): void {
    this.permissionGate?.addDynamicRule(rule);
  }

  /** Expose permission gate for wiring approval handlers */
  getPermissionGate(): PermissionGate | undefined {
    return this.permissionGate;
  }

  async execute(toolId: string, input: unknown, ctx?: ToolContext): Promise<ToolExecutionResult> {
    const tool = this.registry.get(toolId);
    if (!tool) {
      return { status: "error", error: `Tool "${toolId}" not found` };
    }

    // Permission check: only if an explicit gate was provided (kernel handles permissions otherwise)
    if (this.permissionGate && this.hasExplicitGate) {
      const permissionResult = this.permissionGate.checkTool(tool.id, tool.risk, input as Record<string, unknown> | undefined);
      if (!permissionResult.allowed) {
        if (permissionResult.needsApproval) {
          if (!this.approvalHandler) {
            return { status: "denied", reason: `Tool "${tool.id}" requires approval but no handler configured` };
          }
          const approved = await this.approvalHandler.requestApproval(tool, input);
          if (!approved) {
            return { status: "denied", reason: `Tool "${tool.id}" was rejected by user` };
          }
        } else {
          return { status: "denied", reason: permissionResult.reason ?? `Tool "${tool.id}" (risk: ${tool.risk}) is denied by policy` };
        }
      }
    }

    // Pre-hooks: can modify input or deny
    let currentInput = input;
    for (const hook of this.hooks) {
      if (!hook.pre) continue;
      const result = await hook.pre({ toolId, tool, input: currentInput });
      if (result === null) continue;
      if ("denied" in result) {
        return { status: "denied", reason: result.denied };
      }
      currentInput = result.input;
    }

    // Execute via sandbox
    let result: ToolExecutionResult;
    try {
      const toolCtx = ctx ?? signalToToolContext();
      const output = await this.sandbox.execute(tool, currentInput, toolCtx);
      result = { status: "success", output };
    } catch (err) {
      if (err instanceof ToolPermissionDenied) {
        result = { status: "denied", reason: err.message };
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        result = { status: "error", error: msg };
      }
    }

    // Post-hooks: can modify result (run in reverse order)
    for (let i = this.hooks.length - 1; i >= 0; i--) {
      const hook = this.hooks[i]!;
      if (!hook.post) continue;
      const modified = await hook.post({ toolId, tool, input: currentInput, result });
      if (modified !== null) {
        result = modified;
      }
    }

    return result;
  }
}
