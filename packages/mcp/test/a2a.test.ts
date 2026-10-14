import { describe, expect, it } from "vitest";
import {
  A2A_AGENT_CARD_WELL_KNOWN_PATH,
  discoverAgentCard,
  isKnownTaskState,
  isTerminalTaskState,
  KNOWN_TASK_STATES,
} from "../src/index.js";
import type {
  A2AProtocolBinding,
  AgentCapabilities,
  AgentCard,
  AgentCardDocument,
  AgentInterface,
  AgentSkill,
  AgentSecurityScheme,
  DiscoverAgentCardOptions,
  TaskState,
} from "../src/index.js";
import { NetworkError, ValidationError } from "@vinhnt-sdk/schema";

function validCard(): Record<string, unknown> {
  return {
    name: "Researcher",
    description: "Answers research questions",
    version: "1.0.0",
    supportedInterfaces: [
      {
        url: "https://agent.example.com/a2a",
        protocolBinding: "JSONRPC",
        protocolVersion: "1.0",
      },
    ],
    capabilities: { streaming: true, pushNotifications: false },
    skills: [
      { id: "search", name: "Search", description: "Web search", tags: ["web"] },
    ],
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    securitySchemes: { apiKey: { type: "apiKey", in: "header" } },
  };
}

interface Captured {
  url: string;
  init: RequestInit;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", etag: 'W/"card-1"' },
  });
}

function capturingFetch(
  handler: (captured: Captured) => Response | Promise<Response>,
): { fetchImpl: typeof fetch; captured: Captured[] } {
  const captured: Captured[] = [];
  const fetchImpl = (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    const one: Captured = { url: String(url), init: init ?? {} };
    captured.push(one);
    return handler(one);
  }) as typeof fetch;
  return { fetchImpl, captured };
}

describe("A2A constants & task states", () => {
  it("exposes the well-known discovery path", () => {
    expect(A2A_AGENT_CARD_WELL_KNOWN_PATH).toBe(
      "/.well-known/agent-card.json",
    );
  });

  it("KNOWN_TASK_STATES has exactly the 7 v1.0 states", () => {
    expect(KNOWN_TASK_STATES).toHaveLength(7);
    for (const state of KNOWN_TASK_STATES) {
      expect(isKnownTaskState(state)).toBe(true);
    }
    expect(isKnownTaskState("TASK_STATE_ARCHIVED")).toBe(false);
    expect(isKnownTaskState("completed")).toBe(false);
  });

  it("isTerminalTaskState marks only terminal states", () => {
    const terminal: readonly TaskState[] = [
      "TASK_STATE_COMPLETED",
      "TASK_STATE_FAILED",
      "TASK_STATE_CANCELED",
      "TASK_STATE_REJECTED",
    ];
    const live: readonly TaskState[] = [
      "TASK_STATE_SUBMITTED",
      "TASK_STATE_WORKING",
      "TASK_STATE_INPUT_REQUIRED",
    ];
    for (const state of terminal) expect(isTerminalTaskState(state)).toBe(true);
    for (const state of live) expect(isTerminalTaskState(state)).toBe(false);
  });

  it("AgentCard v1.0 shape compiles (canonical data model)", () => {
    const iface: AgentInterface = {
      url: "https://agent.example.com/a2a",
      protocolBinding: "JSONRPC",
      protocolVersion: "1.0",
    };
    const binding: A2AProtocolBinding = "HTTP+JSON";
    const caps: AgentCapabilities = { streaming: true };
    const skill: AgentSkill = { id: "s", name: "S", description: "d" };
    const scheme: AgentSecurityScheme = { type: "apiKey" };
    const card: AgentCard = {
      name: "n",
      description: "d",
      version: "1.0.0",
      supportedInterfaces: [iface],
      capabilities: caps,
      skills: [skill],
      defaultInputModes: ["text"],
      defaultOutputModes: ["text"],
      securitySchemes: { key: scheme },
    };
    expect(card.supportedInterfaces[0]?.protocolBinding).toBe("JSONRPC");
    expect(binding).toBe("HTTP+JSON");
    expect(scheme.type).toBe("apiKey");
  });

  it("DiscoverAgentCardOptions / AgentCardDocument compose", () => {
    const etag = 'W/"card-1"';
    const options: DiscoverAgentCardOptions = { etag };
    const doc: AgentCardDocument = {
      url: "https://x/.well-known/agent-card.json",
      notModified: true,
      etag,
    };
    expect(doc.notModified).toBe(true);
    expect(doc.card).toBeUndefined();
    expect(options.etag).toBe(etag);
  });
});

describe("discoverAgentCard", () => {
  it("appends /.well-known/agent-card.json to a bare origin", async () => {
    const { fetchImpl, captured } = capturingFetch(() =>
      jsonResponse(validCard()),
    );
    const doc = await discoverAgentCard("https://agent.example.com/", {
      fetchImpl,
    });
    expect(captured[0]?.url).toBe(
      "https://agent.example.com/.well-known/agent-card.json",
    );
    expect(captured[0]?.init.method).toBe("GET");
    expect((captured[0]?.init.headers as Record<string, string>)["accept"]).toBe(
      "application/json",
    );
    expect(doc.card?.name).toBe("Researcher");
    expect(doc.etag).toBe('W/"card-1"');
    expect(doc.notModified).toBeUndefined();
  });

  it("requests an explicit card URL as-is (curated registry)", async () => {
    const { fetchImpl, captured } = capturingFetch(() =>
      jsonResponse(validCard()),
    );
    await discoverAgentCard("https://registry.example.com/agents/foo.json", {
      fetchImpl,
    });
    expect(captured[0]?.url).toBe(
      "https://registry.example.com/agents/foo.json",
    );
  });

  it("sends If-None-Match and resolves 304 without a card", async () => {
    const { fetchImpl, captured } = capturingFetch(
      () => new Response(null, { status: 304, headers: { etag: 'W/"card-1"' } }),
    );
    const doc = await discoverAgentCard("https://agent.example.com/", {
      fetchImpl,
      etag: 'W/"card-1"',
    });
    expect(
      (captured[0]?.init.headers as Record<string, string>)["if-none-match"],
    ).toBe('W/"card-1"');
    expect(doc.notModified).toBe(true);
    expect(doc.etag).toBe('W/"card-1"');
    expect(doc.card).toBeUndefined();
  });

  it("forwards the abort signal", async () => {
    const controller = new AbortController();
    const { fetchImpl, captured } = capturingFetch(() =>
      jsonResponse(validCard()),
    );
    await discoverAgentCard("https://agent.example.com/", {
      fetchImpl,
      signal: controller.signal,
    });
    expect(captured[0]?.init.signal).toBe(controller.signal);
  });

  it("rejects an invalid target URL with ValidationError", async () => {
    await expect(discoverAgentCard("not a url")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects a card missing required fields with ValidationError", async () => {
    const incomplete = validCard();
    delete incomplete["skills"];
    const { fetchImpl } = capturingFetch(() => jsonResponse(incomplete));
    const failure = await discoverAgentCard("https://agent.example.com/", {
      fetchImpl,
    }).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ValidationError);
    expect((failure as ValidationError).message).toContain("skills");
  });

  it("rejects a non-object payload with ValidationError", async () => {
    const { fetchImpl } = capturingFetch(() => jsonResponse("nope"));
    await expect(
      discoverAgentCard("https://agent.example.com/", { fetchImpl }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("maps HTTP errors to NetworkError", async () => {
    const { fetchImpl } = capturingFetch(() => jsonResponse({}, 404));
    const failure = await discoverAgentCard("https://agent.example.com/", {
      fetchImpl,
    }).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(NetworkError);
    expect((failure as NetworkError).message).toContain("404");
    expect((failure as NetworkError).retryable).toBe(true);
  });

  it("maps invalid JSON to NetworkError", async () => {
    const { fetchImpl } = capturingFetch(
      () => new Response("<html>", { status: 200 }),
    );
    await expect(
      discoverAgentCard("https://agent.example.com/", { fetchImpl }),
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it("wraps transport failure as NetworkError with cause", async () => {
    const boom = new Error("ECONNRESET");
    const fetchImpl = (async () => {
      throw boom;
    }) as unknown as typeof fetch;
    const failure = await discoverAgentCard("https://agent.example.com/", {
      fetchImpl,
    }).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(NetworkError);
    expect((failure as NetworkError).cause).toBe(boom);
  });
});
