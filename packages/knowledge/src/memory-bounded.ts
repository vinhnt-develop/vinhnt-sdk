import type { MemoryEntry } from "@vinhnt-sdk/schema";
import type { MemoryStore } from "./types.js";
import { InMemoryMemoryStore } from "./memory.js";

export interface BoundedMemoryLimits {
  profileLimit: number;
  workingLimit: number;
}

const DEFAULT_LIMITS: BoundedMemoryLimits = {
  profileLimit: 1400,
  workingLimit: 2200,
};

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return value.slice(0, limit - 3) + "...";
}

export class BoundedMemory {
  private profile = "";
  private working = "";
  private store: MemoryStore;
  private limits: BoundedMemoryLimits;

  constructor(store?: MemoryStore, limits?: Partial<BoundedMemoryLimits>) {
    this.store = store ?? new InMemoryMemoryStore();
    this.limits = { ...DEFAULT_LIMITS, ...limits };
  }

  async setProfile(value: string): Promise<MemoryEntry> {
    this.profile = truncate(value, this.limits.profileLimit);
    await this.store.set({
      key: "_profile",
      value: this.profile,
      sessionId: "_global",
      tier: "long-term",
      tags: ["profile", "bounded"],
    });
    return { key: "_profile", value: this.profile, tier: "stable", charLimit: this.limits.profileLimit };
  }

  getProfile(): MemoryEntry {
    return { key: "_profile", value: this.profile, tier: "stable", charLimit: this.limits.profileLimit };
  }

  async setWorkingFact(key: string, value: string): Promise<MemoryEntry> {
    const current = this.working.length > 0 ? this.working + "\n" : "";
    const line = `${key}: ${value}`;
    this.working = truncate(current + line, this.limits.workingLimit);
    await this.store.set({
      key: `_working:${key}`,
      value,
      sessionId: "_global",
      tier: "working",
      tags: ["working", "bounded"],
    });
    return { key, value, tier: "volatile", charLimit: this.limits.workingLimit };
  }

  getWorking(): string {
    return this.working;
  }

  clearWorking(): void {
    this.working = "";
  }

  getAllBounded(): MemoryEntry[] {
    return [
      { key: "_profile", value: this.profile, tier: "stable", charLimit: this.limits.profileLimit },
      { key: "_working", value: this.working, tier: "volatile", charLimit: this.limits.workingLimit },
    ];
  }

  totalChars(): number {
    return this.profile.length + this.working.length;
  }
}
