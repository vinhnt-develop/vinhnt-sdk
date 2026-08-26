import type { RunStatus } from "@vinhnt-sdk/schema";

/** Run statuses that terminate a run: `succeeded`, `failed`, `cancelled`. */
export const terminalRunStatuses = new Set<RunStatus>([
  "succeeded",
  "failed",
  "cancelled",
]);

/** Whether a run may transition directly from `from` to `to`. */
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
