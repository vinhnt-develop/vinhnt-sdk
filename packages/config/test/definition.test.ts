import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CONFIG_GROUPS, type ConfigFieldMeta } from "../src/definition.js";
import { buildVntConfigSchema, flattenDefinition, getGroupById } from "../src/schema-gen.js";
import { PolicyConfigSchema, LspConfigSchema, NotificationConfigSchema, NetworkConfigSchema, ThemeConfigSchema } from "../src/schema.js";

describe("CONFIG_GROUPS", () => {
  it("has at least one group", () => {
    expect(CONFIG_GROUPS.length).toBeGreaterThan(0);
  });

  it("each group has an id and label", () => {
    for (const g of CONFIG_GROUPS) {
      expect(g.id).toBeTruthy();
      expect(g.label).toBeTruthy();
    }
  });

  it("each group has fields", () => {
    for (const g of CONFIG_GROUPS) {
      expect(g.fields.length).toBeGreaterThan(0);
    }
  });

  it("each field has required meta", () => {
    for (const g of CONFIG_GROUPS) {
      for (const f of g.fields) {
        expect(f.key).toBeTruthy();
        expect(f.label).toBeTruthy();
        expect(f.group).toBeTruthy();
        expect(["text", "password", "number", "toggle", "select", "multi-select", "code", "color", "keybinding"]).toContain(f.control);
      }
    }
  });

  it("children fields have unique keys within their parent", () => {
    for (const g of CONFIG_GROUPS) {
      for (const f of g.fields) {
        if (f.children) {
          const keys = f.children.map((c) => c.key.split(".").pop());
          expect(new Set(keys).size).toBe(keys.length);
        }
      }
    }
  });

  it("top-level field keys are unique", () => {
    const keys = CONFIG_GROUPS.flatMap((g) => g.fields.map((f) => f.key));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("flattenDefinition", () => {
  it("returns all fields including children", () => {
    const flat = flattenDefinition();
    const topCount = CONFIG_GROUPS.flatMap((g) => g.fields).length;
    expect(flat.length).toBeGreaterThan(topCount);
  });

  it("every field references a valid group", () => {
    const flat = flattenDefinition();
    const groupIds = new Set(CONFIG_GROUPS.map((g) => g.id));
    for (const f of flat) {
      expect(groupIds.has(f.group)).toBe(true);
    }
  });
});

describe("getGroupById", () => {
  it("returns a group by id", () => {
    const g = getGroupById("general");
    expect(g).toBeDefined();
    expect(g!.id).toBe("general");
  });

  it("returns undefined for unknown id", () => {
    expect(getGroupById("nonexistent")).toBeUndefined();
  });
});

describe("buildVntConfigSchema", () => {
  const schema = buildVntConfigSchema();

  it("returns a Zod object schema", () => {
    expect(schema.constructor.name).toBe("ZodObject");
  });

  it("validates empty object with defaults", () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      // Fields with defaults are present
      expect(result.data.defaultProvider).toBe("");
      expect(result.data.defaultModel).toBe("");
      expect(result.data.auto).toBe(false);
      // Fields with explicit defaults are present
      expect(result.data.maxTokens).toBe(4096);
      // Optional nested objects are undefined
      expect(result.data.compaction).toBeUndefined();
    }
  });

  it("validates provider record with catch", () => {
    const result = schema.safeParse({
      providers: {
        valid: { apiKey: "sk-test", baseUrl: "https://test.com" },
        invalid: "not an object",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.providers.valid.apiKey).toBe("sk-test");
      expect(result.data.providers.invalid.apiKey).toBe("");
      expect(result.data.providers.invalid.baseUrl).toBe("");
    }
  });

  it("validates compaction with fallback", () => {
    const result = schema.safeParse({
      compaction: { strategy: "unknown" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.compaction?.strategy).toBe("naive");
    }
  });

  it("learning is optional (undefined when not provided)", () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.learning).toBeUndefined();
    }
  });

  it("learning sub-fields get defaults when explicitly provided", () => {
    const result = schema.safeParse({ learning: {} });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.learning?.enabled).toBe(false);
      expect(result.data.learning?.backgroundReview).toBe(false);
      expect(result.data.learning?.memoryCharLimit).toBe(2200);
    }
  });

  it("rejects non-object input", () => {
    const result = schema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("parses new groups with defaults from empty object", () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.policies).toBeUndefined();
      expect(result.data.lsp).toBeUndefined();
      expect(result.data.notifications).toBeUndefined();
      expect(result.data.network).toBeUndefined();
      expect(result.data.keybinds).toEqual({});
      expect(result.data.theme).toBeUndefined();
      expect(result.data.commands).toEqual({});
      expect(result.data.formatters).toEqual({});
    }
  });

  it("validates policies with structured rules", () => {
    const result = schema.safeParse({
      policies: {
        defaultAction: "allow",
        rules: [
          { pattern: "read_file", action: "allow" },
          { pattern: "bash", action: "ask", args: "git *" },
        ],
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.policies?.defaultAction).toBe("allow");
      expect(result.data.policies?.rules).toHaveLength(2);
      expect(result.data.policies?.rules[0].pattern).toBe("read_file");
      expect(result.data.policies?.rules[1].args).toBe("git *");
    }
  });

  it("validates policies with catch fallback for invalid action", () => {
    const result = schema.safeParse({
      policies: { defaultAction: "invalid" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.policies?.defaultAction).toBe("ask");
    }
  });

  it("validates lsp config defaults", () => {
    const result = schema.safeParse({ lsp: {} });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lsp?.autoDetect).toBe(true);
      expect(result.data.lsp?.diagnostics).toBe(true);
      expect(result.data.lsp?.servers).toEqual({});
    }
  });

  it("validates notifications config", () => {
    const result = schema.safeParse({
      notifications: { enabled: true, onFailure: false },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notifications?.enabled).toBe(true);
      expect(result.data.notifications?.onFailure).toBe(false);
      expect(result.data.notifications?.onSuccess).toBe(false);
    }
  });

  it("validates network config with fallback", () => {
    const result = schema.safeParse({
      network: { timeout: -1 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.network?.timeout).toBeGreaterThanOrEqual(1000);
    }
  });

  it("validates theme config with mode fallback", () => {
    const result = schema.safeParse({ theme: { mode: "solarized" } });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.theme?.mode).toBe("dark");
    }
  });

  it("validates keybinds as unknown record", () => {
    const result = schema.safeParse({
      keybinds: { submit: "Ctrl+Enter", cancel: "Escape" },
    });
    expect(result.success).toBe(true);
  });
});

describe("new typed config schemas", () => {
  it("PolicyConfigSchema validates a policy rule", () => {
    const r1 = PolicyConfigSchema.safeParse({
      defaultAction: "deny",
      rules: [{ pattern: "bash", action: "deny" }],
    });
    expect(r1.success).toBe(true);
    if (r1.success) {
      expect(r1.data.defaultAction).toBe("deny");
      expect(r1.data.rules[0].action).toBe("deny");
    }
  });

  it("PolicyConfigSchema catches invalid defaultAction", () => {
    const r = PolicyConfigSchema.safeParse({ defaultAction: "bogus" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.defaultAction).toBe("ask");
    }
  });

  it("PolicyConfigSchema provides defaults for empty input", () => {
    const r = PolicyConfigSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.defaultAction).toBe("ask");
      expect(r.data.rules).toEqual([]);
    }
  });

  it("LspConfigSchema provides defaults", () => {
    const r = LspConfigSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.autoDetect).toBe(true);
      expect(r.data.diagnostics).toBe(true);
    }
  });

  it("NotificationConfigSchema provides defaults", () => {
    const r = NotificationConfigSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.enabled).toBe(true);
      expect(r.data.onSuccess).toBe(false);
    }
  });

  it("NetworkConfigSchema rejects out-of-range maxRetries", () => {
    const r = NetworkConfigSchema.safeParse({ maxRetries: 50 });
    expect(r.success).toBe(false);
  });

  it("NetworkConfigSchema catches non-number timeout", () => {
    const r = NetworkConfigSchema.safeParse({ timeout: "slow" });
    expect(r.success).toBe(false);
  });

  it("ThemeConfigSchema catches invalid mode", () => {
    const r = ThemeConfigSchema.safeParse({ mode: "hacker" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.mode).toBe("dark");
    }
  });
});
