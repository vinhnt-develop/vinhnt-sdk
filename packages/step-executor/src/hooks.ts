/**
 * Minimal structural plugin-hook surface used by the step executor.
 *
 * Hosts (e.g. core's `PluginManager`) only need to implement `fireHook` for
 * the tool-lifecycle / permission hook names; no direct dependency on the
 * full plugin contract.
 */
export interface StepExecutorPluginHooks {
  fireHook(
    name:
      | "onToolInvoked"
      | "onBeforeToolExecution"
      | "onAfterToolExecution"
      | "onToolCompleted"
      | "onToolFailed"
      | "onShellEnv"
      | "onPermissionAsk",
    data: Record<string, unknown>,
  ):
    | Promise<{ modified: Record<string, unknown> } | null | void>
    | { modified: Record<string, unknown> }
    | null
    | void;
}