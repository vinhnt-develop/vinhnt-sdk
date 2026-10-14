import { describe, expect, it } from "vitest";
import { AgentKernel } from "../src/kernel/kernel.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../src/fakes/fake-store.js";
import { FakeTool } from "../src/fakes/fake-tool.js";
import { getTextContent } from "../src/model.js";
import type { ModelRequest, ModelResponse } from "../src/model.js";
import {
  InMemorySessionStore,
  createRunState,
  loadSessionHistory,
  parseRunState,
  replayRunFromStore,
  serializeRunState,
} from "@vinhnt-sdk/session";
import type { RequestId, RunEvent, TraceId } from "@vinhnt-sdk/schema";

const testCtx = {
  requestId: "req-g41" as RequestId,
  traceId: "trace-g41" as TraceId,
  actorId: "actor-g41",
  tenantId: "tenant-g41",
} as const;

function dataOf(event: RunEvent | undefined): Record<string, unknown> {
  return (event?.data ?? {}) as Record<string, unknown>;
}

/** FakeModelProvider that records every request so tests can assert what the model saw. */
class CapturingModel extends FakeModelProvider {
  readonly requests: ModelRequest[] = [];

  override async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    this.requests.push({ ...request, messages: [...request.messages] });
    return super.generate(request, signal);
  }
}

function sentTexts(model: CapturingModel, requestIndex = 0): string[] {
  return (model.requests[requestIndex]?.messages ?? []).map((m) => `${m.role}:${getTextContent(m.content)}`);
}

describe("kernel.runFromState (G4.1)", () => {
  it("seeds serialized history + prompt, restores step and threads sessionId", async () => {
    const sessionStore = new InMemorySessionStore();
    const session = await sessionStore.createSession("G4.1 chat");
    await sessionStore.addMessage(session.id, { role: "user", content: "first question" });
    await sessionStore.addMessage(session.id, { role: "assistant", content: "first answer" });

    const model = new CapturingModel([{ content: "second answer", provider: "fake" }]);
    const eventStore = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store: eventStore, sessionStore, tools: [], maxSteps: 5 });

    const history = await loadSessionHistory(sessionStore, session.id);
    expect(history).toHaveLength(2);

    const state = createRunState({
      prompt: "second question",
      messages: history,
      sessionId: session.id,
      step: 1,
      toolCallCount: 2,
    });
    // Full serialize/parse round-trip before handing to the kernel.
    const handle = kernel.runFromState(parseRunState(serializeRunState(state)), testCtx);
    await handle.completed;

    // The model received prior history followed by the fresh prompt.
    const texts = sentTexts(model);
    expect(texts).toContain("user:first question");
    expect(texts).toContain("assistant:first answer");
    expect(texts.at(-1)).toBe("user:second question");

    // run.started carries the durable sessionId (G4.1) and the prompt.
    const events = await eventStore.list(handle.runId);
    const started = events.find((e) => e.type === "run.started");
    expect(started).toBeDefined();
    expect(dataOf(started).sessionId).toBe(session.id);
    expect(dataOf(started).prompt).toBe("second question");

    // The restored step counter drives step accounting.
    const stepStarted = events.find((e) => e.type === "step.started");
    expect(dataOf(stepStarted).step).toBe(1);

    const completed = events.find((e) => e.type === "run.completed");
    expect(dataOf(completed).status).toBe("succeeded");

    // The prompt was persisted exactly once (history contract: no duplication).
    const rows = await sessionStore.listMessages(session.id);
    expect(rows.filter((r) => r.content === "second question")).toHaveLength(1);
    expect(rows[0]!.content).toBe("first question");
  });

  it("works without a sessionId and omits the field from run.started", async () => {
    const model = new CapturingModel([{ content: "plain", provider: "fake" }]);
    const eventStore = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store: eventStore, tools: [], maxSteps: 3 });

    const handle = kernel.runFromState(createRunState({ prompt: "hello" }), testCtx);
    await handle.completed;

    const texts = sentTexts(model);
    expect(texts).toEqual(["user:hello"]);

    const events = await eventStore.list(handle.runId);
    const started = events.find((e) => e.type === "run.started");
    expect(started).toBeDefined();
    expect("sessionId" in dataOf(started)).toBe(false);
  });

  it("replays a kernel tool-calling run back into an equivalent transcript", async () => {
    const readFile = new FakeTool("read_file", async () => "FILE_BODY");
    const model = new FakeModelProvider([
      { content: "", provider: "fake", toolCalls: [{ id: "call-1", name: "read_file", args: { path: "x.txt" } }] },
      { content: "The file says FILE_BODY", provider: "fake" },
    ]);
    const eventStore = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store: eventStore, tools: [readFile], maxSteps: 5 });

    const handle = kernel.run("read x.txt", testCtx);
    await handle.completed;

    const completed = (await eventStore.list(handle.runId)).find((e) => e.type === "run.completed");
    expect(dataOf(completed).status).toBe("succeeded");

    const messages = await replayRunFromStore(eventStore, handle.runId);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant", "tool", "assistant"]);
    expect(messages[0]!.content).toBe("read x.txt");
    expect(messages[1]!.toolCalls).toEqual([
      { id: "call-1", name: "read_file", args: { path: "x.txt" } },
    ]);
    expect(messages[2]!.toolCallId).toBe("call-1");
    expect(String(messages[2]!.content)).toContain("FILE_BODY");
    expect(messages[3]!.content).toBe("The file says FILE_BODY");

    // The replayed transcript is provider-ready: paired toolCalls <-> tool result.
    const assistant = messages[1]!;
    const toolIds = messages.filter((m) => m.role === "tool").map((m) => m.toolCallId);
    expect(assistant.toolCalls!.map((tc) => tc.id)).toEqual(toolIds);

    const types = (await eventStore.list(handle.runId)).map((e) => e.type);
    expect(types).toContain("llm.response");
    expect(types).toContain("tool.completed");
  });

  it("emits sessionId on run.started for direct kernel.run calls with a session", async () => {
    const model = new CapturingModel([{ content: "ok", provider: "fake" }]);
    const eventStore = new FakeRunEventStore();
    const kernel = new AgentKernel({ model, store: eventStore, tools: [], maxSteps: 3 });

    const handle = kernel.run("direct", testCtx, "ses_direct");
    await handle.completed;

    const started = (await eventStore.list(handle.runId)).find((e) => e.type === "run.started");
    expect(dataOf(started).sessionId).toBe("ses_direct");
    expect(dataOf(started).prompt).toBe("direct");
  });
});
