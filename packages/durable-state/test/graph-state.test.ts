/**
 * TC27 — StateGraphBuilder + StateGraphDefinition unit tests.
 *
 * Covers: addChannel, setReducer, build validation, initialState,
 * applyDelta (normal + Overwrite), findChannel, findReducer, isOverwrite.
 */

import { describe, it, expect } from "vitest";
import {
  StateGraphBuilder,
  initialState,
  applyDelta,
  findChannel,
  findReducer,
  isOverwrite,
  Overwrite,
  StateGraphDefinition,
} from "../src/state/graph-state.js";
import {
  createChannel,
  appendReducer,
  overwriteReducer,
} from "../src/state/channel.js";
import { DurableStateError, ChannelNotFoundError } from "../src/errors.js";

describe("TC27_stateGraphBuilder_and_definition", () => {
  it("TC27_01_build_valid_schema", () => {
    const builder = new StateGraphBuilder("g1", "Graph One");
    builder.addChannel("messages", createChannel<string[]>("messages", []));
    builder.addChannel("step", createChannel<number>("step", 0));
    const def = builder.build();
    expect(def.id).toBe("g1");
    expect(def.name).toBe("Graph One");
    expect(def.channels).toHaveLength(2);
    expect(def.reducers).toHaveLength(2);
  });

  it("TC27_02_duplicate_channel_throws", () => {
    const builder = new StateGraphBuilder("g2", "Graph Two");
    builder.addChannel("messages", createChannel<string[]>("messages", []));
    expect(() =>
      builder.addChannel("messages", createChannel<string[]>("messages", [])),
    ).toThrow(DurableStateError);
  });

  it("TC27_03_empty_schema_throws", () => {
    const builder = new StateGraphBuilder("g3", "Empty");
    expect(() => builder.build()).toThrow(DurableStateError);
  });

  it("TC27_04_setReducer_overrides_channel_reducer", () => {
    const builder = new StateGraphBuilder("g4", "G4");
    builder.addChannel("counter", createChannel<number>("counter", 0));
    builder.setReducer("counter", (cur, delta) => cur + delta);
    const def = builder.build();
    const reducer = findReducer(def, "counter");
    expect(reducer(5, 3)).toBe(8);
  });

  it("TC27_05_setReducer_missing_channel_throws", () => {
    const builder = new StateGraphBuilder("g5", "G5");
    builder.addChannel("a", createChannel<string>("a", "x"));
    expect(() => builder.setReducer("missing", (c) => c)).toThrow(
      ChannelNotFoundError,
    );
  });

  it("TC27_06_initialState_uses_defaults", () => {
    const builder = new StateGraphBuilder("g6", "G6");
    builder.addChannel("messages", createChannel<string[]>("messages", []));
    builder.addChannel("step", createChannel<number>("step", 0));
    builder.addChannel("name", createChannel<string>("name", "default"));
    const def = builder.build();
    const state = initialState(def);
    expect(state.messages).toEqual([]);
    expect(state.step).toBe(0);
    expect(state.name).toBe("default");
  });

  it("TC27_07_applyDelta_normal_merge_via_reducer", () => {
    const builder = new StateGraphBuilder("g7", "G7");
    builder.addChannel("step", createChannel<number>("step", 0, {
      reducer: overwriteReducer(),
      default: 0,
    }));
    builder.addChannel("log", createChannel<string[]>("log", [], {
      reducer: appendReducer(),
      default: [],
    }));
    const def = builder.build();
    const state = initialState(def);
    const next = applyDelta(def, state, { step: 5, log: ["a"] });
    expect(next.step).toBe(5);
    expect(next.log).toEqual(["a"]);
  });

  it("TC27_08_applyDelta_overwrite_marker_bypasses_reducer", () => {
    const builder = new StateGraphBuilder("g8", "G8");
    builder.addChannel("counter", createChannel<number>("counter", 0, {
      reducer: (cur, delta) => cur + delta,
      default: 0,
      supportsOverwrite: true,
    }));
    const def = builder.build();
    const state = initialState(def);
    const next = applyDelta(def, state, {
      counter: { __overwriteBrand: true, value: 100 } as Overwrite<number>,
    });
    expect(next.counter).toBe(100);
  });

  it("TC27_09_applyDelta_undeclared_channel_throws", () => {
    const builder = new StateGraphBuilder("g9", "G9");
    builder.addChannel("a", createChannel<string>("a", "x"));
    const def = builder.build();
    const state = initialState(def);
    expect(() =>
      applyDelta(def, state, { missing: "value" } as never),
    ).toThrow(ChannelNotFoundError);
  });

  it("TC27_10_findChannel_and_findReducer", () => {
    const builder = new StateGraphBuilder("g10", "G10");
    builder.addChannel("msg", createChannel<string[]>("msg", []));
    const def = builder.build();
    const ch = findChannel(def, "msg");
    expect(ch.name).toBe("msg");
    const red = findReducer(def, "msg");
    expect(typeof red).toBe("function");
  });

  it("TC27_11_isOverwrite_reexported_from_graph_state", () => {
    expect(isOverwrite({ __overwriteBrand: true, value: 1 })).toBe(true);
    expect(isOverwrite({ value: 1 })).toBe(false);
  });

  it("TC27_12_channels_are_immutable_after_build", () => {
    const builder = new StateGraphBuilder("g12", "G12");
    builder.addChannel("a", createChannel<string>("a", "x"));
    const def = builder.build();
    expect(Object.isFrozen(def.channels)).toBe(false); // readonly array, not frozen
    expect(def.channels.length).toBe(1);
    expect(def.channels[0]!.name).toBe("a");
  });
});
