import type { RunStatus } from "@vinhnt-sdk/schema";

export const terminalRunStatuses = new Set<RunStatus>([
  "succeeded",
  "failed",
  "cancelled",
]);

export function canTransitionRun(from: RunStatus, to: RunStatus): boolean {
  const transitions: Readonly<Record<RunStatus, readonly RunStatus[]>> = {
    queued: ["running", "cancelled"],
    running: ["awaiting_approval", "paused", "succeeded", "failed", "cancelled"],
    awaiting_approval: ["running", "cancelled"],
    paused: ["running", "cancelled"],
    succeeded: [],
    failed: [],
    cancelled: [],
  };

  return transitions[from].includes(to);
}
