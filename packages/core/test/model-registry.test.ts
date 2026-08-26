import { describe, expect, it } from "vitest";
import { InMemoryModelRegistry } from "../src/model.js";
import { FakeModelProvider } from "../src/fakes/fake-model.js";

describe("InMemoryModelRegistry", () => {
  it("register and get a model provider", () => {
    const reg = new InMemoryModelRegistry();
    const provider = new FakeModelProvider([{ content: "hi" }]);
    reg.register("gpt-4o", provider);
    expect(reg.get("gpt-4o")).toBe(provider);
  });

  it("returns undefined for unknown model", () => {
    const reg = new InMemoryModelRegistry();
    expect(reg.get("unknown")).toBeUndefined();
  });

  it("lists registered models", () => {
    const reg = new InMemoryModelRegistry();
    reg.register("gpt-4o", new FakeModelProvider([{ content: "a" }]));
    reg.register("claude-3", new FakeModelProvider([{ content: "b" }]));
    expect(reg.list()).toHaveLength(2);
    expect(reg.list().map((e) => e.id)).toEqual(["gpt-4o", "claude-3"]);
  });

  it("overwrites existing registration", () => {
    const reg = new InMemoryModelRegistry();
    const a = new FakeModelProvider([{ content: "a" }]);
    const b = new FakeModelProvider([{ content: "b" }]);
    reg.register("model-x", a);
    reg.register("model-x", b);
    expect(reg.get("model-x")).toBe(b);
    expect(reg.list()).toHaveLength(1);
  });
});