import { describe, it, expect } from "vitest";
import { canTransitionRun, terminalRunStatuses } from "../src/kernel/state-machine.js";

describe("canTransitionRun", () => {
  it("allows queued → running", () => {
    expect(canTransitionRun("queued", "running")).toBe(true);
  });

  it("allows queued → cancelled", () => {
    expect(canTransitionRun("queued", "cancelled")).toBe(true);
  });

  it("disallows queued → succeeded", () => {
    expect(canTransitionRun("queued", "succeeded")).toBe(false);
  });

  it("allows running → succeeded", () => {
    expect(canTransitionRun("running", "succeeded")).toBe(true);
  });

  it("allows running → failed", () => {
    expect(canTransitionRun("running", "failed")).toBe(true);
  });

  it("allows running → cancelled", () => {
    expect(canTransitionRun("running", "cancelled")).toBe(true);
  });

  it("allows running → awaiting_approval", () => {
    expect(canTransitionRun("running", "awaiting_approval")).toBe(true);
  });

  it("allows running → paused", () => {
    expect(canTransitionRun("running", "paused")).toBe(true);
  });

  it("disallows running → queued", () => {
    expect(canTransitionRun("running", "queued")).toBe(false);
  });

  it("allows awaiting_approval → running", () => {
    expect(canTransitionRun("awaiting_approval", "running")).toBe(true);
  });

  it("allows awaiting_approval → cancelled", () => {
    expect(canTransitionRun("awaiting_approval", "cancelled")).toBe(true);
  });

  it("disallows awaiting_approval → succeeded", () => {
    expect(canTransitionRun("awaiting_approval", "succeeded")).toBe(false);
  });

  it("allows paused → running", () => {
    expect(canTransitionRun("paused", "running")).toBe(true);
  });

  it("allows paused → cancelled", () => {
    expect(canTransitionRun("paused", "cancelled")).toBe(true);
  });

  it("disallows terminal states from transitioning", () => {
    for (const status of terminalRunStatuses) {
      expect(canTransitionRun(status as string as never, "running")).toBe(false);
      expect(canTransitionRun(status as string as never, "cancelled")).toBe(false);
    }
  });

  it("terminalRunStatuses contains succeeded, failed, cancelled", () => {
    expect(terminalRunStatuses.has("succeeded")).toBe(true);
    expect(terminalRunStatuses.has("failed")).toBe(true);
    expect(terminalRunStatuses.has("cancelled")).toBe(true);
    expect(terminalRunStatuses.size).toBe(3);
  });
});
