import { describe, expect, it } from "vitest";

import { canTransitionRun, terminalRunStatuses } from "../src/index.js";

describe("run state machine", () => {
  it("allows a queued run to start", () => {
    expect(canTransitionRun("queued", "running")).toBe(true);
  });

  it("does not allow a terminal run to restart", () => {
    expect(canTransitionRun("succeeded", "running")).toBe(false);
    expect(terminalRunStatuses.has("succeeded")).toBe(true);
  });
});
