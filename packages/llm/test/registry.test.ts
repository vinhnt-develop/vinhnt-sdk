import { describe, expect, it } from "vitest";
import { LlmRegistry, AdapterRegistrationError } from "../src/registry.js";
import { MockAdapter } from "./mock-adapter.js";
import type { RetryPolicy } from "../src/adapter.js";

describe("LlmRegistry", () => {
  it("registers and retrieves an adapter", () => {
    const registry = new LlmRegistry();
    const adapter = new MockAdapter();
    registry.registerAdapter(["deepseek"], adapter);

    expect(registry.getAdapter("deepseek")).toBe(adapter);
  });

  it("returns undefined for unregistered provider", () => {
    const registry = new LlmRegistry();
    expect(registry.getAdapter("unknown")).toBeUndefined();
  });

  it("registers one adapter for multiple provider names", () => {
    const registry = new LlmRegistry();
    const adapter = new MockAdapter("openai");
    registry.registerAdapter(["openai", "azure"], adapter);

    expect(registry.getAdapter("openai")).toBe(adapter);
    expect(registry.getAdapter("azure")).toBe(adapter);
  });

  it("hasProvider returns true for registered and false for unregistered", () => {
    const registry = new LlmRegistry();
    registry.registerAdapter(["deepseek"], new MockAdapter());

    expect(registry.hasProvider("deepseek")).toBe(true);
    expect(registry.hasProvider("unknown")).toBe(false);
  });

  it("listProviders returns registered providers with routes", () => {
    const registry = new LlmRegistry();
    registry.registerAdapter(["deepseek"], new MockAdapter("deepseek"));
    registry.registerAdapter(["openai", "azure"], new MockAdapter("openai"));

    const providers = registry.listProviders();
    expect(providers).toHaveLength(2);

    const deepseek = providers.find((p) => p.id === "deepseek");
    expect(deepseek).toBeDefined();
    expect(deepseek!.routes).toEqual(["deepseek"]);

    const openai = providers.find((p) => p.id === "openai");
    expect(openai).toBeDefined();
    expect(openai!.routes).toEqual(["openai", "azure"]);
  });

  it("clear removes all registrations", () => {
    const registry = new LlmRegistry();
    registry.registerAdapter(["deepseek"], new MockAdapter());
    registry.registerAdapter(["openai"], new MockAdapter());

    registry.clear();

    expect(registry.getAdapter("deepseek")).toBeUndefined();
    expect(registry.getAdapter("openai")).toBeUndefined();
    expect(registry.listProviders()).toHaveLength(0);
  });

  it("throws DUPLICATE_ADAPTER on duplicate registration", () => {
    const registry = new LlmRegistry();
    registry.registerAdapter(["deepseek"], new MockAdapter());

    expect(() => registry.registerAdapter(["deepseek"], new MockAdapter())).toThrow(AdapterRegistrationError);
    try {
      registry.registerAdapter(["deepseek"], new MockAdapter());
    } catch (e) {
      expect(e).toBeInstanceOf(AdapterRegistrationError);
      expect((e as AdapterRegistrationError).code).toBe("DUPLICATE_ADAPTER");
    }
  });

  it("throws EMPTY_PROVIDERS for empty provider list", () => {
    const registry = new LlmRegistry();
    expect(() => registry.registerAdapter([], new MockAdapter())).toThrow(AdapterRegistrationError);
    try {
      registry.registerAdapter([], new MockAdapter());
    } catch (e) {
      expect(e).toBeInstanceOf(AdapterRegistrationError);
      expect((e as AdapterRegistrationError).code).toBe("EMPTY_PROVIDERS");
    }
  });

  it("registerAdapter returns a handle with dispose()", () => {
    const registry = new LlmRegistry();
    const handle = registry.registerAdapter(["deepseek"], new MockAdapter());

    expect(registry.hasProvider("deepseek")).toBe(true);

    handle.dispose();

    expect(registry.hasProvider("deepseek")).toBe(false);
    expect(registry.getAdapter("deepseek")).toBeUndefined();
  });

  it("dispose on one handle does not affect other registrations", () => {
    const registry = new LlmRegistry();
    const h1 = registry.registerAdapter(["deepseek"], new MockAdapter());
    registry.registerAdapter(["openai"], new MockAdapter());

    h1.dispose();

    expect(registry.hasProvider("deepseek")).toBe(false);
    expect(registry.hasProvider("openai")).toBe(true);
  });

  it("handle.replace() swaps the adapter for all routes", () => {
    const registry = new LlmRegistry();
    const h = registry.registerAdapter(["openai", "azure"], new MockAdapter("v1"));

    const v2 = new MockAdapter("v2");
    h.replace(v2);

    expect(registry.getAdapter("openai")).toBe(v2);
    expect(registry.getAdapter("azure")).toBe(v2);
  });

  it("replace after dispose is a no-op", () => {
    const registry = new LlmRegistry();
    const h = registry.registerAdapter(["openai"], new MockAdapter("v1"));
    h.dispose();

    // Should not throw
    h.replace(new MockAdapter("v2"));
    expect(registry.hasProvider("openai")).toBe(false);
  });

  it("getRetryPolicy returns adapter's retry policy", () => {
    const policy: RetryPolicy = { maxRetries: 5, baseDelayMs: 500 };
    const registry = new LlmRegistry();
    registry.registerAdapter(["deepseek"], new MockAdapter("deepseek", policy));

    expect(registry.getRetryPolicy("deepseek")).toEqual(policy);
  });

  it("getRetryPolicy returns undefined for unregistered provider", () => {
    const registry = new LlmRegistry();
    expect(registry.getRetryPolicy("unknown")).toBeUndefined();
  });

  it("same adapter instance returned for all its routes", () => {
    const registry = new LlmRegistry();
    const adapter = new MockAdapter("shared");
    registry.registerAdapter(["a", "b", "c"], adapter);

    expect(registry.getAdapter("a")).toBe(adapter);
    expect(registry.getAdapter("b")).toBe(adapter);
    expect(registry.getAdapter("c")).toBe(adapter);
  });
});
