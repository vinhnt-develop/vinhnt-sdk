import type { MemoryStore } from "./types.js";
import { SessionMemory } from "./memory.js";
import type { WriteApprovalQueue } from "./approval.js";
import type { BoundedMemory } from "./memory-bounded.js";

/** Options controlling whether memory writes require explicit approval. */
export interface ReviewOptions {
  readonly requireApproval: boolean;
}

interface FactExtraction {
  key: string;
  value: string;
}

/** Asynchronously reviews sessions and extracts/records facts into memory. */
export class BackgroundReview {
  private sessionMem: SessionMemory;
  private boundedMem: BoundedMemory;
  private approvalQueue: WriteApprovalQueue | undefined;

  constructor(
    sessionId: string,
    boundedMem: BoundedMemory,
    store?: MemoryStore,
    approvalQueue?: WriteApprovalQueue,
  ) {
    this.sessionMem = new SessionMemory(sessionId, store);
    this.boundedMem = boundedMem;
    this.approvalQueue = approvalQueue;
  }

  async reviewTurn(
    messages: { role: string; content: string }[],
    options: ReviewOptions = { requireApproval: false },
  ): Promise<{ extracted: FactExtraction[]; approved: boolean }> {
    const extracted: FactExtraction[] = [];
    for (const msg of messages) {
      if (msg.role !== "assistant" && msg.role !== "user") continue;
      const facts = this.extractFacts(msg.content);
      extracted.push(...facts);
    }

    if (extracted.length === 0) return { extracted: [], approved: true };

    for (const { key, value } of extracted) {
      if (options.requireApproval && this.approvalQueue) {
        await this.approvalQueue.requestApproval({
          type: "memory.write",
          description: `Extract fact: ${key} = ${value}`,
          payload: { key, value },
        });
      } else {
        await this.boundedMem.setWorkingFact(key, value);
        await this.sessionMem.remember(key, value, ["auto-extracted"]);
      }
    }

    const pendingCount = this.approvalQueue?.listPending().length ?? 0;
    return {
      extracted,
      approved: !options.requireApproval || pendingCount === 0,
    };
  }

  private extractFacts(content: string): FactExtraction[] {
    const facts: FactExtraction[] = [];
    const patterns = [
      { re: /(?:remember|note|record|save|store)\s+(?:that\s+)?(.{10,200})/gi, keyPrefix: "fact" },
      { re: /(?:I\s+(?:learn(?:ed)?|found|discovered|noticed)\s+that\s+)(.{10,200})/gi, keyPrefix: "discovery" },
      { re: /(?:key\s+(?:fact|finding|decision):\s*)(.{10,200})/gi, keyPrefix: "" },
    ];
    for (const { re, keyPrefix } of patterns) {
      let match: RegExpExecArray | null;
      while ((match = re.exec(content)) !== null) {
        const captured = match[1];
        if (!captured) continue;
        const val = captured.trim();
        const idx = val.indexOf(": ");
        if (idx > 0 && idx < 60) {
          facts.push({ key: val.slice(0, idx).trim(), value: val.slice(idx + 2).trim() });
        } else if (keyPrefix) {
          facts.push({ key: keyPrefix, value: val });
        } else {
          facts.push({ key: `_fact_${facts.length + 1}`, value: val });
        }
      }
    }
    return facts;
  }
}
