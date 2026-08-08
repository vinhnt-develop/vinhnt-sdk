import type { PluginHooks, HookResult } from "@vinhnt-sdk/core";
import { definePlugin } from "@vinhnt-sdk/plugin";
import { Logger } from "./logger.js";
import { ConsoleSink } from "./console-sink.js";
import { FileSink } from "./file-sink.js";
import type { LogLevel } from "./logger.js";

export interface ObservabilityPluginOptions {
  readonly logLevel?: LogLevel;
  readonly logFile?: string;
  readonly logMaxSize?: number;
  readonly logMaxFiles?: number;
  readonly auditFile?: string;
  readonly namespace?: string;
}

export function createObservabilityPlugin(options: ObservabilityPluginOptions = {}) {
  const logger = new Logger({
    minLevel: options.logLevel ?? "info",
    sinks: [
      new ConsoleSink(),
      ...(options.logFile ? [new FileSink(options.logFile, { maxSize: options.logMaxSize, maxFiles: options.logMaxFiles })] : []),
    ],
    context: { namespace: options.namespace ?? "vnt" },
  });

  const auditSink = options.auditFile
    ? new FileSink(options.auditFile, { maxSize: options.logMaxSize ?? 50 * 1024 * 1024, maxFiles: options.logMaxFiles ?? 10 })
    : null;

  let runStartTime = 0;
  let runInputTokens = 0;
  let runOutputTokens = 0;
  let runCost = 0;

  function writeAudit(entry: Record<string, unknown>): void {
    if (!auditSink) return;
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
    auditSink.write({ timestamp: line, level: "info", message: line, context: {} } as never);
  }

  const hooks: PluginHooks = {
    async onRunStarted(data) {
      logger.info("Run started", { runId: data.runId, prompt: data.prompt?.slice(0, 200) });
      runStartTime = Date.now();
      runInputTokens = 0;
      runOutputTokens = 0;
      runCost = 0;
      writeAudit({ action: "run.started", runId: data.runId, prompt: data.prompt?.slice(0, 500) });
    },

    async onStepCompleted(data) {
      logger.debug("Step completed", { step: data.step, toolCallCount: data.toolCallCount });
      writeAudit({ action: "step.completed", step: data.step, toolCallCount: data.toolCallCount });
    },

    async onRunCompleted(data) {
      if (data.error) {
        logger.error(`Run failed: ${data.error}`, undefined, { status: data.status });
        writeAudit({ action: "run.failed", status: data.status, error: data.error, durationMs: Date.now() - runStartTime });
      } else {
        logger.info("Run completed", { status: data.status });
        writeAudit({
          action: "run.completed", status: data.status, durationMs: Date.now() - runStartTime,
          inputTokens: runInputTokens, outputTokens: runOutputTokens, cost: runCost,
        });
      }
    },

    async onToolInvoked(data): Promise<HookResult<{ input: unknown }>> {
      logger.info("Tool invoked", { toolName: data.toolName, toolId: data.toolId });
      writeAudit({ action: "tool.invoked", toolName: data.toolName, toolId: data.toolId, input: data.input });
      return null;
    },

    async onToolCompleted(data): Promise<HookResult<{ output: unknown }>> {
      logger.info("Tool completed", { toolName: data.toolName, toolId: data.toolId });
      writeAudit({ action: "tool.completed", toolName: data.toolName, toolId: data.toolId, output: data.output });
      return null;
    },

    async onToolFailed(data) {
      logger.warn(`Tool failed: ${data.error}`, { toolName: data.toolName, toolId: data.toolId });
      writeAudit({ action: "tool.failed", toolName: data.toolName, toolId: data.toolId, error: data.error });
    },

    async onContextCompressed(data) {
      logger.debug("Context compressed", { originalCount: data.originalCount, compressedCount: data.compressedCount });
      writeAudit({ action: "context.compressed", originalCount: data.originalCount, compressedCount: data.compressedCount });
    },

    async onTokenStreamed(data) {
      logger.debug("Token streamed", { content: data.content?.slice(0, 100) });
    },
  };

  return definePlugin(
    {
      id: "observability",
      name: "Observability Plugin",
      version: "1.0.0",
      description: "Logs agent lifecycle events via the observability system",
    },
    {
      hooks,
      activate: async () => {
        logger.info("Observability plugin activated");
        if (auditSink) logger.info("Audit log enabled", { auditFile: options.auditFile });
      },
      deactivate: async () => { logger.info("Observability plugin deactivated"); },
    },
  );
}
