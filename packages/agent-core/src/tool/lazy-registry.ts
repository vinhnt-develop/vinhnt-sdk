import type { ToolDefinition } from "./definitions.js";
import { ToolRegistry } from "./registry.js";

export interface LazyToolEntry {
  id: string;
  risk?: "low" | "medium" | "high";
  factory: () => Promise<ToolDefinition>;
  instance?: ToolDefinition;
}

export class LazyToolRegistry extends ToolRegistry {
  private entries = new Map<string, LazyToolEntry>();
  private loading = new Map<string, Promise<ToolDefinition>>();

  registerLazy(entry: LazyToolEntry): void {
    this.entries.set(entry.id, entry);
  }

  async resolve(id: string): Promise<ToolDefinition | undefined> {
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    if (entry.instance) return entry.instance;
    if (this.loading.has(id)) return this.loading.get(id);

    const promise = entry.factory().then((tool) => {
      entry.instance = tool;
      this.loading.delete(id);
      return tool;
    }).catch((err) => {
      this.loading.delete(id);
      throw err;
    });
    this.loading.set(id, promise);
    return promise;
  }

  override register(tool: ToolDefinition): void {
    super.register(tool);
    this.entries.set(tool.id, { id: tool.id, factory: async () => tool, instance: tool });
  }

  override unregister(id: string): boolean {
    return this.entries.delete(id);
  }

  override list(): ToolDefinition[] {
    return Array.from(this.entries.values())
      .filter((e) => e.instance)
      .map((e) => e.instance!);
  }

  listLazy(): LazyToolEntry[] {
    return Array.from(this.entries.values());
  }

  override count(): number {
    return this.entries.size;
  }

  override getOrThrow(id: string): ToolDefinition {
    const entry = this.entries.get(id);
    if (!entry?.instance) throw new Error(`Tool '${id}' not found or not yet loaded`);
    return entry.instance;
  }

  isLoaded(id: string): boolean {
    return this.entries.get(id)?.instance !== undefined;
  }

  async resolveAll(): Promise<ToolDefinition[]> {
    const results: ToolDefinition[] = [];
    for (const [id] of this.entries) {
      const tool = await this.resolve(id).catch(() => undefined);
      if (tool) results.push(tool);
    }
    return results;
  }
}
