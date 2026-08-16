import { describe, expect, it } from "vitest";
import { AgentKernel } from "../../src/kernel/kernel.js";
import { createCodingDomain } from "@vinhnt-sdk/tools";
import { ToolRegistry } from "@vinhnt-sdk/tools";
import { FakeModelProvider } from "../../src/fakes/fake-model.js";
import { FakeRunEventStore } from "../../src/fakes/fake-store.js";
import { FakeTool } from "../../src/fakes/fake-tool.js";
import type { ModelRequest, ModelResponse, AgentConfig } from "@vinhnt-sdk/schema";

const testCtx = {
  requestId: "test-req-1",
  traceId: "test-trace-1",
  actorId: "test-actor-1",
  tenantId: "test-tenant-1",
} as const;

/** Subclass that captures the tools each model request was given. */
class CapturingModel extends FakeModelProvider {
  readonly seenToolIds: string[][] = [];
  constructor(responses: ModelResponse[]) {
    super(responses);
  }
  override async generate(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    this.seenToolIds.push((request.tools ?? []).map((t) => t.id));
    return super.generate(request, signal);
  }
}

function makeAgent(overrides: Partial<AgentConfig>): AgentConfig {
  return {
    id: "test-agent",
    profile: { name: "Test", description: "test" },
    capabilities: {},
    ...overrides,
  } as AgentConfig;
}

async function runAndCollect(model: CapturingModel, kernel: AgentKernel): Promise<string[][]> {
  const handle = kernel.run("hello", testCtx);
  await handle.completed;
  return model.seenToolIds;
}

describe("DomainManifest + createCodingDomain", () => {
  it("groups the coding toolset under domain id 'coding'", () => {
    const readFile = new FakeTool("read_file");
    const shell = new FakeTool("execute_command");
    const manifest = createCodingDomain([readFile, shell]);
    expect(manifest.id).toBe("coding");
    expect(manifest.tools.map((t) => t.id)).toEqual(["read_file", "execute_command"]);
  });
});

describe("ToolRegistry domain membership", () => {
  it("maps tools to their registered domain and leaves others core", () => {
    const registry = new ToolRegistry();
    const readFile = new FakeTool("read_file");
    const question = new FakeTool("question");
    registry.register(readFile);
    registry.register(question);
    registry.registerDomain(createCodingDomain([readFile]));

    expect(registry.domainFor("read_file")).toBe("coding");
    expect(registry.domainFor("question")).toBeUndefined();
    expect(registry.getDomains().map((d) => d.id)).toEqual(["coding"]);
  });
});

describe("AgentKernel domain filtering", () => {
  it("shows every tool when the agent declares no domains (legacy behaviour)", async () => {
    const model = new CapturingModel([{ content: "ok" }]);
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      tools: [new FakeTool("read_file"), new FakeTool("question")],
      maxSteps: 5,
    });
    kernel.setCurrentAgent(makeAgent({}));

    const seen = await runAndCollect(model, kernel);
    expect(seen[0]!.sort()).toEqual(["question", "read_file"]);
  });

  it("shows coding + core tools for an agent with domains: ['coding']", async () => {
    const model = new CapturingModel([{ content: "ok" }]);
    const readFile = new FakeTool("read_file");
    const question = new FakeTool("question");
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      tools: [readFile, question],
      maxSteps: 5,
    });
    kernel.registerDomain(createCodingDomain([readFile]));
    kernel.setCurrentAgent(makeAgent({ domains: ["coding"] }));

    const seen = await runAndCollect(model, kernel);
    expect(seen[0]!.sort()).toEqual(["question", "read_file"]);
  });

  it("hides coding tools and keeps core tools for an agent with domains: []", async () => {
    const model = new CapturingModel([{ content: "ok" }]);
    const readFile = new FakeTool("read_file");
    const question = new FakeTool("question");
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      tools: [readFile, question],
      maxSteps: 5,
    });
    kernel.registerDomain(createCodingDomain([readFile]));
    kernel.setCurrentAgent(makeAgent({ domains: [] }));

    const seen = await runAndCollect(model, kernel);
    expect(seen[0]).toEqual(["question"]);
  });

  it("hides coding tools when the agent lists only unrelated domains", async () => {
    const model = new CapturingModel([{ content: "ok" }]);
    const readFile = new FakeTool("read_file");
    const question = new FakeTool("question");
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      tools: [readFile, question],
      maxSteps: 5,
    });
    kernel.registerDomain(createCodingDomain([readFile]));
    kernel.setCurrentAgent(makeAgent({ domains: ["research"] }));

    const seen = await runAndCollect(model, kernel);
    expect(seen[0]).toEqual(["question"]);
  });

  it("filters through a shared ToolRegistry too", async () => {
    const model = new CapturingModel([{ content: "ok" }]);
    const registry = new ToolRegistry();
    const readFile = new FakeTool("read_file");
    const question = new FakeTool("question");
    registry.register(readFile);
    registry.register(question);
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      toolRegistry: registry,
      maxSteps: 5,
    });
    kernel.registerDomain(createCodingDomain([readFile]));
    kernel.setCurrentAgent(makeAgent({ domains: [] }));

    const seen = await runAndCollect(model, kernel);
    expect(seen[0]).toEqual(["question"]);
  });

  it("mcp: domains mount/unmount whole MCP servers mechanically", async () => {
    const model = new CapturingModel([{ content: "ok" }]);
    const s1Tool = new FakeTool("mcp__s1__list_prs");
    const s2Tool = new FakeTool("mcp__gmail__send");
    const core = new FakeTool("question");
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      tools: [s1Tool, s2Tool, core],
      maxSteps: 5,
    });
    kernel.registerDomain({ id: "mcp:s1", tools: [s1Tool] });
    kernel.registerDomain({ id: "mcp:gmail", tools: [s2Tool] });

    kernel.setCurrentAgent(makeAgent({ domains: ["mcp:s1"] }));
    const seen = await runAndCollect(model, kernel);
    expect(seen[0]!.sort()).toEqual(["mcp__s1__list_prs", "question"]);
  });

  it("per-server 'deny' permission default removes the whole server's tools", async () => {
    const model = new CapturingModel([{ content: "ok" }]);
    const s1Tool = new FakeTool("mcp__s1__list_prs");
    const core = new FakeTool("question");
    const kernel = new AgentKernel({
      model,
      store: new FakeRunEventStore(),
      tools: [s1Tool, core],
      maxSteps: 5,
    });
    kernel.registerDomain({
      id: "mcp:s1",
      tools: [s1Tool],
      permissionDefaults: [{ action: "mcp__s1__*", effect: "deny" }],
    });

    kernel.setCurrentAgent(makeAgent({ domains: ["mcp:s1"] }));
    const seen = await runAndCollect(model, kernel);
    expect(seen[0]).toEqual(["question"]);
  });
});
