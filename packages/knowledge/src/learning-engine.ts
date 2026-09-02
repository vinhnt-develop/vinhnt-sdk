interface LearningConfig {
  enabled: boolean;
  backgroundReview: boolean;
  memoryWriteApproval: boolean;
  skillWriteApproval: boolean;
  memoryCharLimit: number;
  userCharLimit: number;
}
import { BoundedMemory } from "./memory-bounded.js";
import { BackgroundReview } from "./review.js";
import { WriteApprovalQueue } from "./approval.js";
import { ContextCompressor } from "./compressor.js";
import { InMemoryMemoryStore } from "./memory.js";
import type { MemoryEntry } from "@vinhnt-sdk/schema";
import type { MemoryStore } from "./types.js";

/** Options for {@link LearningEngine}: runtime flags and session scope. */
export interface LearningEngineOptions {
  readonly config: LearningConfig;
  readonly sessionId: string;
  /**
   * Pluggable memory store. Defaults to `InMemoryMemoryStore` if not provided.
   * Inject a persistent implementation (e.g., PostgresMemoryStore) for production.
   */
  readonly store?: MemoryStore;
}

/**
 * Coordinates memory learning for a session: bounded storage, background
 * review, approval-gated writes and conversation compression.
 */
export class LearningEngine {
  private config: LearningConfig;
  private store: MemoryStore;
  private boundedMem: BoundedMemory;
  private approvalQueue: WriteApprovalQueue;
  private review: BackgroundReview;
  private compressor: ContextCompressor;
  private enabled: boolean;

  constructor(options: LearningEngineOptions) {
    this.config = options.config;
    this.enabled = options.config.enabled;
    this.store = options.store ?? new InMemoryMemoryStore();
    this.boundedMem = new BoundedMemory(this.store, {
      profileLimit: options.config.userCharLimit,
      workingLimit: options.config.memoryCharLimit,
    });
    this.approvalQueue = new WriteApprovalQueue();
    this.review = new BackgroundReview(
      options.sessionId,
      this.boundedMem,
      this.store,
      this.approvalQueue,
    );
    this.compressor = new ContextCompressor();
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(val: boolean): void {
    this.enabled = val;
  }

  getBoundedMemory(): BoundedMemory {
    return this.boundedMem;
  }

  getApprovalQueue(): WriteApprovalQueue {
    return this.approvalQueue;
  }

  getCompressor(): ContextCompressor {
    return this.compressor;
  }

  buildMemoryBlock(): MemoryEntry[] {
    return this.boundedMem.getAllBounded();
  }

  async processTurn(
    messages: { role: string; content: string }[],
  ): Promise<{ extracted: number; staged: number }> {
    if (!this.enabled || !this.config.backgroundReview) {
      return { extracted: 0, staged: 0 };
    }
    const result = await this.review.reviewTurn(messages, {
      requireApproval: this.config.memoryWriteApproval,
    });
    return {
      extracted: result.extracted.length,
      staged: this.approvalQueue.listPending().length,
    };
  }

  getPendingApprovals() {
    return this.approvalQueue.listPending();
  }

  async approveMemory(id: string): Promise<boolean> {
    const req = await this.approvalQueue.approve(id);
    if (!req) return false;
    const payload = req.payload as { key?: string; value?: string };
    if (payload.key && payload.value !== undefined) {
      await this.boundedMem.setWorkingFact(payload.key, payload.value);
    }
    return true;
  }

  async rejectMemory(id: string): Promise<boolean> {
    const req = await this.approvalQueue.reject(id);
    return req !== undefined;
  }

  async setProfile(value: string): Promise<void> {
    await this.boundedMem.setProfile(value);
  }

  async setWorkingFact(key: string, value: string): Promise<void> {
    await this.boundedMem.setWorkingFact(key, value);
  }

  clearWorking(): void {
    this.boundedMem.clearWorking();
  }
}
