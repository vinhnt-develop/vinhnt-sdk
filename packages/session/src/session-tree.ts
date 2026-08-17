import type { SessionId, SessionNode, SessionTreeSnapshot, SessionTreeEvent } from "@vinhnt-sdk/schema";

export interface SessionTree {
  add(sessionId: SessionId, title: string, parentId?: SessionId): void;
  remove(sessionId: SessionId): void;
  move(sessionId: SessionId, newParentId?: SessionId): void;
  get(sessionId: SessionId): SessionNode | undefined;
  getChildren(sessionId: SessionId): readonly SessionNode[];
  getAncestors(sessionId: SessionId): readonly SessionNode[];
  getRoots(): readonly SessionNode[];
  getSnapshot(): SessionTreeSnapshot;
  setActive(sessionId: SessionId): void;
  setTitle(sessionId: SessionId, title: string): void;
  onEvent(listener: (event: SessionTreeEvent) => void): () => void;
}

interface InternalNode {
  id: SessionId;
  title: string;
  parentId: SessionId | undefined;
  children: SessionId[];
  isActive: boolean;
  createdAt: number;
}

export class InMemorySessionTree implements SessionTree {
  private readonly nodes = new Map<string, InternalNode>();
  private readonly listeners = new Set<(event: SessionTreeEvent) => void>();
  private activeId: SessionId | null = null;

  add(sessionId: SessionId, title: string, parentId?: SessionId): void {
    if (this.nodes.has(sessionId)) return;

    if (parentId && !this.nodes.has(parentId)) {
      return; // Parent doesn't exist
    }

    this.nodes.set(sessionId, {
      id: sessionId,
      title,
      parentId,
      children: [],
      isActive: false,
      createdAt: Date.now(),
    });

    if (parentId) {
      const parent = this.nodes.get(parentId)!;
      parent.children.push(sessionId);
    }

    this.emit({ type: "node.added", sessionId, data: { title, parentId } });
  }

  remove(sessionId: SessionId): void {
    const node = this.nodes.get(sessionId);
    if (!node) return;

    // Remove from parent
    if (node.parentId) {
      const parent = this.nodes.get(node.parentId);
      if (parent) {
        parent.children = parent.children.filter((id) => id !== sessionId);
      }
    }

    // Recursively remove children
    for (const childId of [...node.children]) {
      this.remove(childId);
    }

    this.nodes.delete(sessionId);
    if (this.activeId === sessionId) {
      this.activeId = null;
    }

    this.emit({ type: "node.removed", sessionId, data: {} });
  }

  move(sessionId: SessionId, newParentId?: SessionId): void {
    const node = this.nodes.get(sessionId);
    if (!node) return;
    if (newParentId && !this.nodes.has(newParentId)) return;
    if (newParentId === sessionId) return;
    if (newParentId && this.isDescendant(sessionId, newParentId)) return; // Cycle guard

    // Remove from old parent
    if (node.parentId) {
      const parent = this.nodes.get(node.parentId);
      if (parent) {
        parent.children = parent.children.filter((id) => id !== sessionId);
      }
    }

    // Add to new parent
    node.parentId = newParentId;
    if (newParentId) {
      const newParent = this.nodes.get(newParentId)!;
      newParent.children.push(sessionId);
    }

    this.emit({ type: "node.moved", sessionId, data: { newParentId } });
  }

  get(sessionId: SessionId): SessionNode | undefined {
    const node = this.nodes.get(sessionId);
    if (!node) return undefined;
    return this.toNode(node);
  }

  getChildren(sessionId: SessionId): readonly SessionNode[] {
    const node = this.nodes.get(sessionId);
    if (!node) return [];
    return node.children.map((id) => this.nodes.get(id)!).filter(Boolean).map((n) => this.toNode(n));
  }

  getAncestors(sessionId: SessionId): readonly SessionNode[] {
    const ancestors: SessionNode[] = [];
    let current = this.nodes.get(sessionId);
    while (current?.parentId) {
      const parent = this.nodes.get(current.parentId);
      if (!parent) break;
      ancestors.unshift(this.toNode(parent));
      current = parent;
    }
    return ancestors;
  }

  getRoots(): readonly SessionNode[] {
    return [...this.nodes.values()]
      .filter((n) => !n.parentId)
      .map((n) => this.toNode(n));
  }

  getSnapshot(): SessionTreeSnapshot {
    const roots = this.getRoots();
    const all: SessionNode[] = [];

    const stack = [...roots];
    while (stack.length > 0) {
      const node = stack.pop()!;
      all.push(node);
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]!);
      }
    }

    return {
      rootId: roots.length === 1 ? roots[0]!.id : null,
      nodes: all,
      activeSessionId: this.activeId,
    };
  }

  setActive(sessionId: SessionId): void {
    if (!this.nodes.has(sessionId)) return;

    // Deactivate all
    for (const node of this.nodes.values()) {
      node.isActive = false;
    }

    this.nodes.get(sessionId)!.isActive = true;
    this.activeId = sessionId;

    this.emit({ type: "node.activated", sessionId, data: {} });
  }

  setTitle(sessionId: SessionId, title: string): void {
    const node = this.nodes.get(sessionId);
    if (!node) return;
    node.title = title;
    this.emit({ type: "node.title_changed", sessionId, data: { title } });
  }

  onEvent(listener: (event: SessionTreeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private toNode(node: InternalNode, _depth = 0): SessionNode {
    const children = node.children
      .map((id) => this.nodes.get(id))
      .filter((n): n is InternalNode => !!n);
    return {
      id: node.id,
      title: node.title,
      ...(node.parentId !== undefined ? { parentId: node.parentId } : {}),
      children: children.map((n) => this.toNode(n, _depth + 1)),
      isActive: node.isActive,
      createdAt: node.createdAt,
      depth: _depth,
    };
  }

  private isDescendant(ancestorId: SessionId, candidateId: SessionId): boolean {
    let current = this.nodes.get(candidateId);
    while (current?.parentId) {
      if (current.parentId === ancestorId) return true;
      current = this.nodes.get(current.parentId);
    }
    return false;
  }

  private emit(event: SessionTreeEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch { /* isolated */ }
    }
  }
}
