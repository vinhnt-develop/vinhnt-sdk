/**
 * TC32 — Integration: time-travel resume from checkpointId.
 *
 * Covers: full graph run → checkpoint → getTuple(checkpointId) → resume with
 * Command → state preserved across resume, proving durable time-travel works.
 */

import { describe, it, expect } from "vitest";
import {
  StateGraphBuilder,
  StateGraphExecutor,
  createChannel,
  overwriteReducer,
  createMemoryCheckpointer,
  Command,
} from "../src/index.js";
import type { GraphConfig } from "../src/state/checkpoint.js";

describe("TC32_integration_time_travel_resume", () => {
  it("TC32_01_resume_from_checkpoint_preserves_state", async () => {
    const builder = new StateGraphBuilder("tt-graph", "Time Travel Graph");
    builder.addChannel("counter", createChannel<number>("counter", 0, {
      reducer: overwriteReducer(),
      default: 0,
    }));
    builder.addChannel("log", createChannel<string[]>("log", [], {
      reducer: (cur, delta) => [...cur, ...delta],
      default: [],
    }));
    const def = builder.build();
    const cp = createMemoryCheckpointer();
    const executor = new StateGraphExecutor(def, cp);

    const config: GraphConfig = { threadId: "tt-session", checkpointNs: "" };

    // Step 1: run node "a" → counter=1, log=["a"], goto "b"
    executor.addNode("a", async () => ({
      update: { counter: 1, log: ["a"] },
      goto: "b",
    }));
    // Step 2: run node "b" → counter=2, log=["a","b"] (stop here)
    executor.addNode("b", async (state) => ({
      update: {
        counter: (state.counter as number) + 1,
        log: [...(state.log as string[]), "b"],
      },
    }));

    const first = await executor.run("a", config);
    expect(first.completed).toBe(true);
    expect(first.snapshot.values).toEqual({ counter: 2, log: ["a", "b"] });

    // Grab the latest checkpoint id
    const history = await cp.list("tt-session");
    expect(history.length).toBeGreaterThanOrEqual(2);
    const latest = history[0];
    expect(latest).not.toBeUndefined();
    const checkpointId = latest!.config.checkpointId;

    // Step 3: resume from that checkpoint — state should be counter=2
    const resumed = await executor.resume(
      { ...config, checkpointId },
      Command.update({ counter: 10 }),
    );
    expect(resumed.completed).toBe(true);
    expect(resumed.snapshot.values).toEqual({ counter: 10, log: ["a", "b"] });
  });
});
