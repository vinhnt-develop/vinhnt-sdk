/**
 * TC26 — StateChannel + Reducer unit tests.
 *
 * Covers: createChannel, createChannelWithReducer, built-in reducers
 * (overwriteReducer, appendReducer, mergeReducer), channelName, isOverwrite,
 * Overwrite marker bypass.
 */

import { describe, it, expect } from "vitest";
import {
  StateChannel,
  Reducer,
  createChannel,
  createChannelWithReducer,
  overwriteReducer,
  appendReducer,
  mergeReducer,
  channelName,
  isOverwrite,
  Overwrite,
} from "../src/state/channel.js";

describe("TC26_stateChannel_and_reducer", () => {
  it("TC26_01_createChannel_uses_overwrite_reducer_by_default", () => {
    const ch = createChannel<number>("counter", 0);
    expect(ch.name).toBe("counter");
    expect(ch.default).toBe(0);
    expect(ch.supportsOverwrite).toBe(true);
    // overwrite reducer: ignores current, returns delta
    expect(ch.reducer(5, 10)).toBe(10);
  });

  it("TC26_02_createChannelWithReducer_custom_merge", () => {
    const ch = createChannelWithReducer<number, number>(
      "counter",
      (current, delta) => current + delta,
      0,
      { supportsOverwrite: false },
    );
    expect(ch.name).toBe("counter");
    expect(ch.default).toBe(0);
    expect(ch.supportsOverwrite).toBe(false);
    expect(ch.reducer(5, 3)).toBe(8);
    expect(ch.reducer(8, 2)).toBe(10);
  });

  it("TC26_03_overwriteReducer_ignores_current", () => {
    const r = overwriteReducer<string>();
    expect(r("old", "new")).toBe("new");
    expect(r("", "x")).toBe("x");
  });

  it("TC26_04_appendReducer_concatenates_arrays", () => {
    const r = appendReducer<number>();
    expect(r([1, 2], [3])).toEqual([1, 2, 3]);
    expect(r([], [1])).toEqual([1]);
    // does not mutate input
    const a = [1];
    const b = [2];
    const result = r(a, b);
    expect(result).toEqual([1, 2]);
    expect(a).toEqual([1]);
    expect(b).toEqual([2]);
  });

  it("TC26_05_mergeReducer_shallow_merges_objects", () => {
    const r = mergeReducer<{ a: number; b?: string }>();
    expect(r({ a: 1, b: "x" }, { b: "y" })).toEqual({ a: 1, b: "y" });
    expect(r({ a: 0 }, { a: 5 })).toEqual({ a: 5 });
  });

  it("TC26_06_channelName_branded_type", () => {
    const name = channelName("messages");
    expect(name).toBe("messages");
    expect(typeof name).toBe("string");
  });

  it("TC26_07_isOverwrite_detects_marker", () => {
    expect(isOverwrite({ __overwriteBrand: true, value: 5 })).toBe(true);
    expect(isOverwrite({ value: 5 })).toBe(false);
    expect(isOverwrite(5)).toBe(false);
    expect(isOverwrite(null)).toBe(false);
    expect(isOverwrite("text")).toBe(false);
  });

  it("TC26_08_Overwrite_marker_type", () => {
    const marker: Overwrite<number> = { __overwriteBrand: true, value: 42 };
    expect(marker.value).toBe(42);
  });

  it("TC26_09_StateChannel_interface_shape", () => {
    const ch: StateChannel<string, string> = {
      name: "log",
      type: "string",
      reducer: (cur, delta) => cur + delta,
      default: "",
      supportsOverwrite: true,
    };
    expect(ch.name).toBe("log");
    expect(ch.default).toBe("");
    expect(ch.supportsOverwrite).toBe(true);
  });

  it("TC26_10_Reducer_type_signature", () => {
    const r: Reducer<number, number> = (current, delta) => current + delta;
    expect(r(1, 2)).toBe(3);
    const r2: Reducer<string> = (_cur, delta) => delta;
    expect(r2("old", "new")).toBe("new");
  });
});
