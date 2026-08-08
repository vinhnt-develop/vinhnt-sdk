import type { AgentCard } from "./types.js";

/** Agent discovery registry for finding and managing agent cards. */
export class AgentDiscovery {
  private readonly agents = new Map<string, AgentCard>();
  private readonly directoryUrls: string[] = [];

  /** Register an agent card locally. */
  register(card: AgentCard): void {
    this.agents.set(card.id, card);
  }

  /** Unregister an agent. */
  unregister(agentId: string): void {
    this.agents.delete(agentId);
  }

  /** Get a specific agent card. */
  get(agentId: string): AgentCard | undefined {
    return this.agents.get(agentId);
  }

  /** List all registered agents. */
  list(): readonly AgentCard[] {
    return [...this.agents.values()];
  }

  /** Find agents by capability. */
  findByCapability(capabilityId: string): readonly AgentCard[] {
    return this.list().filter((agent) =>
      agent.capabilities.some((cap) => cap.id === capabilityId)
    );
  }

  /** Add a directory URL for federated discovery. */
  addDirectory(url: string): void {
    if (!this.directoryUrls.includes(url)) {
      this.directoryUrls.push(url);
    }
  }

  /** Get all directory URLs. */
  getDirectories(): readonly string[] {
    return this.directoryUrls;
  }

  /** Serialize all registered agents to JSON. */
  toJSON(): AgentCard[] {
    return [...this.list()];
  }

  /** Load agents from serialized JSON. */
  fromJSON(cards: AgentCard[]): void {
    for (const card of cards) {
      this.register(card);
    }
  }
}
