import { describe, expect, it, beforeEach } from "vitest";
import { EventMigrationRegistry } from "../src/migration.js";

describe("EventMigrationRegistry", () => {
  beforeEach(() => {
    EventMigrationRegistry.clear();
  });

  it("returns data unchanged when no migrations registered", () => {
    const data = { prompt: "hello", count: 1 };
    const result = EventMigrationRegistry.migrate("run.started", 1, data);
    expect(result).toEqual(data);
  });

  it("applies a single migration", () => {
    EventMigrationRegistry.register("run.completed", 1, (data) => ({
      ...data,
      newField: "migrated",
    }));
    const data = { status: "succeeded" };
    const result = EventMigrationRegistry.migrate("run.completed", 1, data);
    expect(result).toEqual({ status: "succeeded", newField: "migrated" });
  });

  it("chains multiple migrations", () => {
    EventMigrationRegistry.register("run.completed", 1, (data) => ({
      ...data,
      step1: true,
    }));
    EventMigrationRegistry.register("run.completed", 2, (data) => ({
      ...data,
      step2: true,
    }));
    const data = { status: "succeeded" };
    const result = EventMigrationRegistry.migrate("run.completed", 1, data);
    expect(result).toEqual({ status: "succeeded", step1: true, step2: true });
  });

  it("skips migrations when fromVersion >= target", () => {
    EventMigrationRegistry.register("run.completed", 1, (data) => ({
      ...data,
      migrated: true,
    }));
    const data = { status: "succeeded" };
    const result = EventMigrationRegistry.migrate("run.completed", 2, data);
    expect(result).toEqual(data); // unchanged
  });

  it("getLatestVersion returns highest toVersion", () => {
    EventMigrationRegistry.register("run.completed", 1, (d) => d);
    EventMigrationRegistry.register("run.completed", 3, (d) => d);
    expect(EventMigrationRegistry.getLatestVersion("run.completed")).toBe(4);
    expect(EventMigrationRegistry.getLatestVersion("unknown.type")).toBe(0);
  });

  it("hasMigrations returns true when migrations exist", () => {
    expect(EventMigrationRegistry.hasMigrations("run.completed")).toBe(false);
    EventMigrationRegistry.register("run.completed", 1, (d) => d);
    expect(EventMigrationRegistry.hasMigrations("run.completed")).toBe(true);
  });

  it("clear() removes all migrations", () => {
    EventMigrationRegistry.register("run.completed", 1, (d) => d);
    EventMigrationRegistry.clear();
    expect(EventMigrationRegistry.hasMigrations("run.completed")).toBe(false);
  });

  it("does not mutate original data", () => {
    EventMigrationRegistry.register("run.completed", 1, (data) => ({
      ...data,
      extra: true,
    }));
    const original = { status: "succeeded" };
    const result = EventMigrationRegistry.migrate("run.completed", 1, original);
    expect(original).toEqual({ status: "succeeded" }); // unchanged
    expect(result).not.toBe(original); // new object
  });
});