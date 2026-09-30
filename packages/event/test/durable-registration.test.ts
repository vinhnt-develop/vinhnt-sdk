import { describe, expect, it } from "vitest";
import { EventRegistry } from "../src/definition.js";
import "../src/events.js";

const EXPECTED_DURABLE_RUNID = [
  // previously non-durable (E2)
  "tool.self_correcting",
  "step.type_changed",
  "token.counted",
  "thinking.started",
  "thinking.content",
  "thinking.completed",
  "model.cost",
  // newly registered (E2)
  "turn.started",
  "turn.end",
  "agent.handoff",
  "llm.failover",
  "llm.request",
  "llm.response",
];

describe("E2 durable runId registration", () => {
  it("TC01_all_planned_event_types_are_registered_durable_runId_with_schema", () => {
    const all = EventRegistry.getAll();
    for (const type of EXPECTED_DURABLE_RUNID) {
      const def = all.find((d) => d.type === type);
      expect(def, `Event "${type}" should be registered`).toBeTruthy();
      expect(def!.durable, `Event "${type}" should be durable`).toEqual({ version: 1, aggregate: "runId" });
      expect(def!.schema, `Event "${type}" should have a linked Zod schema`).toBeTruthy();
    }
  });

  it("TC02_new_events_pass_their_own_schema_validation", () => {
    const cases: Record<string, unknown> = {
      "turn.started": { turn: 3 },
      "turn.end": { turn: 3, reason: "completed" },
      "agent.handoff": { fromAgentId: "a1", toAgentId: "a2", reason: "route" },
      "llm.failover": { fromProvider: "p1", fromModel: "m1", toProvider: "p2", toModel: "m2", reason: "timeout" },
      "llm.request": { step: 1, model: "m" },
      "llm.response": { step: 1, content: "hi", usage: { inputTokens: 1, outputTokens: 2 }, durationMs: 5 },
    };
    for (const [type, data] of Object.entries(cases)) {
      const def = EventRegistry.get(type);
      expect(def, `Event "${type}" should be registered`).toBeTruthy();
      const parsed = def!.schema!.safeParse(data);
      expect(parsed.success, `Event "${type}" data should validate: ${JSON.stringify(parsed)}`).toBe(true);
    }
  });

  it("TC03_agent_handoff_schema_rejects_missing_fields", () => {
    const def = EventRegistry.get("agent.handoff");
    expect(def).toBeTruthy();
    expect(def!.schema!.safeParse({ fromAgentId: "a1" }).success).toBe(false);
  });

  it("TC04_every_durable_registry_event_has_a_schema", () => {
    const durable = EventRegistry.getAll().filter((d) => d.durable);
    expect(durable.length).toBeGreaterThanOrEqual(20);
    for (const def of durable) {
      expect(def.schema, `Durable event "${def.type}" must link a Zod schema`).toBeTruthy();
    }
  });
});
