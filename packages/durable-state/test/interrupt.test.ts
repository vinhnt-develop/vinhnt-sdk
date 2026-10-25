/**
 * TC29 — interrupt() + Command unit tests.
 *
 * Covers: interrupt throws GraphInterrupt, Command factory functions
 * (resume, resumeWithUpdate, resumeAndGoto, update, goto, PARENT),
 * isCommand type guard, interruptId branding.
 */

import { describe, it, expect } from "vitest";
import {
  interrupt,
  Command,
  isCommand,
  interruptId,
} from "../src/state/interrupt.js";
import { GraphInterrupt } from "../src/errors.js";

describe("TC29_interrupt_and_command", () => {
  it("TC29_01_interrupt_throws_GraphInterrupt", () => {
    expect(() => interrupt("approve?", { nodeId: "approval" })).toThrow(
      GraphInterrupt,
    );
  });

  it("TC29_02_graphInterrupt_carries_value_and_id", () => {
    let err: unknown;
    try {
      interrupt("user-choice", { nodeId: "n1", interruptId: "int_abc" });
    } catch (e) {
      err = e;
    }
    const gi = err as GraphInterrupt;
    expect(gi.interruptValue).toBe("user-choice");
    expect(gi.interruptId).toBe("int_abc");
    expect(gi.nodeId).toBe("n1");
    expect(gi.code).toBe("GRAPH_INTERRUPT");
    expect(gi.name).toBe("GraphInterrupt");
  });

  it("TC29_03_graphInterrupt_auto_generates_id", () => {
    let err: unknown;
    try {
      interrupt("x", { nodeId: "n1" });
    } catch (e) {
      err = e;
    }
    const gi = err as GraphInterrupt;
    expect(typeof gi.interruptId).toBe("string");
    expect(gi.interruptId.length).toBeGreaterThan(0);
  });

  it("TC29_04_command_resume", () => {
    const cmd = Command.resume("yes");
    expect(cmd.resume).toBe("yes");
    expect(cmd.update).toBeUndefined();
    expect(cmd.goto).toBeUndefined();
  });

  it("TC29_05_command_resumeWithUpdate", () => {
    const cmd = Command.resumeWithUpdate("ok", { step: 3 });
    expect(cmd.resume).toBe("ok");
    expect(cmd.update).toEqual({ step: 3 });
  });

  it("TC29_06_command_resumeAndGoto", () => {
    const cmd = Command.resumeAndGoto("proceed", "next-node");
    expect(cmd.resume).toBe("proceed");
    expect(cmd.goto).toBe("next-node");
  });

  it("TC29_07_command_update", () => {
    const cmd = Command.update({ counter: 5 });
    expect(cmd.update).toEqual({ counter: 5 });
    expect(cmd.resume).toBeUndefined();
    expect(cmd.goto).toBeUndefined();
  });

  it("TC29_08_command_goto", () => {
    const cmd = Command.goto("target");
    expect(cmd.goto).toBe("target");
  });

  it("TC29_09_command_parent_symbol", () => {
    expect(Command.PARENT).toBe("__parent__");
  });

  it("TC29_10_isCommand_type_guard", () => {
    expect(isCommand({ resume: "v" })).toBe(true);
    expect(isCommand({ update: { a: 1 } })).toBe(true);
    expect(isCommand({ goto: "n" })).toBe(true);
    expect(isCommand({ graph: Command.PARENT })).toBe(true);
    expect(isCommand({ foo: 1 })).toBe(false);
    expect(isCommand("string")).toBe(false);
    expect(isCommand(null)).toBe(false);
    expect(isCommand([1, 2])).toBe(false);
  });

  it("TC29_11_interruptId_branding", () => {
    const id = interruptId("custom-int");
    expect(id).toBe("custom-int");
    expect(typeof id).toBe("string");
  });
});
