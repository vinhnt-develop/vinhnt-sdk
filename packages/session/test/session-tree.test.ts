import { describe, it, expect, vi } from "vitest";
import { InMemorySessionTree } from "../src/session-tree.js";
import type { SessionId } from "@vinhnt-sdk/schema";

function sid(id: string) { return id as SessionId; }

describe("InMemorySessionTree", () => {
  it("starts empty", () => {
    const tree = new InMemorySessionTree();
    expect(tree.getRoots()).toEqual([]);
    expect(tree.getSnapshot().nodes).toEqual([]);
  });

  describe("add", () => {
    it("adds a root node", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("s1"), "Session 1");
      expect(tree.getRoots()).toHaveLength(1);
      expect(tree.get(sid("s1"))!.title).toBe("Session 1");
    });

    it("adds a child node", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("parent"), "Parent");
      tree.add(sid("child"), "Child", sid("parent"));
      const parent = tree.get(sid("parent"))!;
      expect(parent.children).toHaveLength(1);
      expect(parent.children[0]!.id).toBe("child");
    });

    it("ignores duplicate add", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("s1"), "First");
      tree.add(sid("s1"), "Second");
      expect(tree.getRoots()).toHaveLength(1);
    });

    it("ignores add with nonexistent parent", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("orphan"), "Orphan", sid("ghost"));
      expect(tree.getRoots()).toHaveLength(0);
    });

    it("emits node.added event", () => {
      const tree = new InMemorySessionTree();
      const fn = vi.fn();
      tree.onEvent(fn);
      tree.add(sid("s1"), "Test");
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: "node.added", sessionId: "s1" }));
    });
  });

  describe("remove", () => {
    it("removes a leaf node", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("s1"), "R1");
      tree.add(sid("s2"), "R2");
      tree.remove(sid("s1"));
      expect(tree.getRoots()).toHaveLength(1);
      expect(tree.get(sid("s1"))).toBeUndefined();
    });

    it("removes node with children recursively", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("parent"), "P");
      tree.add(sid("child"), "C", sid("parent"));
      tree.add(sid("grandchild"), "GC", sid("child"));
      tree.remove(sid("parent"));
      expect(tree.getRoots()).toHaveLength(0);
      expect(tree.get(sid("grandchild"))).toBeUndefined();
    });

    it("removes child from parent's children list", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("parent"), "P");
      tree.add(sid("child"), "C", sid("parent"));
      tree.remove(sid("child"));
      expect(tree.get(sid("parent"))!.children).toHaveLength(0);
    });

    it("clears activeId when removing active node", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("s1"), "S1");
      tree.setActive(sid("s1"));
      tree.remove(sid("s1"));
      expect(tree.getSnapshot().activeSessionId).toBeNull();
    });

    it("is no-op for nonexistent node", () => {
      const tree = new InMemorySessionTree();
      tree.remove(sid("ghost"));
    });

    it("emits node.removed event", () => {
      const tree = new InMemorySessionTree();
      const fn = vi.fn();
      tree.add(sid("s1"), "S1");
      tree.onEvent(fn);
      tree.remove(sid("s1"));
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: "node.removed", sessionId: "s1" }));
    });
  });

  describe("move", () => {
    it("moves node to new parent", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      tree.add(sid("b"), "B");
      tree.add(sid("c"), "C", sid("a"));
      tree.move(sid("c"), sid("b"));
      expect(tree.get(sid("a"))!.children).toHaveLength(0);
      expect(tree.get(sid("b"))!.children).toHaveLength(1);
      expect(tree.get(sid("c"))!.parentId).toBe("b");
    });

    it("moves node to root", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      tree.add(sid("b"), "B", sid("a"));
      tree.move(sid("b"));
      expect(tree.get(sid("b"))!.parentId).toBeUndefined();
      expect(tree.getRoots()).toHaveLength(2);
    });

    it("prevents moving node to itself", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      tree.move(sid("a"), sid("a"));
      expect(tree.get(sid("a"))!.parentId).toBeUndefined();
    });

    it("prevents creating cycles", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      tree.add(sid("b"), "B", sid("a"));
      tree.add(sid("c"), "C", sid("b"));
      // Moving 'a' under 'c' would create a cycle
      tree.move(sid("a"), sid("c"));
      expect(tree.get(sid("a"))!.parentId).toBeUndefined();
    });

    it("is no-op for nonexistent node", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      tree.move(sid("ghost"), sid("a"));
      expect(tree.getRoots()).toHaveLength(1);
    });

    it("is no-op for nonexistent new parent", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      tree.move(sid("a"), sid("ghost"));
      expect(tree.get(sid("a"))!.parentId).toBeUndefined();
    });

    it("emits node.moved event", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      tree.add(sid("b"), "B");
      const fn = vi.fn();
      tree.onEvent(fn);
      tree.move(sid("b"), sid("a"));
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: "node.moved" }));
    });
  });

  describe("getChildren", () => {
    it("returns empty for leaf node", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      expect(tree.getChildren(sid("a"))).toEqual([]);
    });

    it("returns children of node", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      tree.add(sid("b"), "B", sid("a"));
      tree.add(sid("c"), "C", sid("a"));
      const children = tree.getChildren(sid("a"));
      expect(children).toHaveLength(2);
      expect(children.map((c) => c.id)).toEqual(["b", "c"]);
    });

    it("returns empty for nonexistent node", () => {
      const tree = new InMemorySessionTree();
      expect(tree.getChildren(sid("ghost"))).toEqual([]);
    });
  });

  describe("getAncestors", () => {
    it("returns empty for root node", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      expect(tree.getAncestors(sid("a"))).toEqual([]);
    });

    it("returns ancestors in order", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      tree.add(sid("b"), "B", sid("a"));
      tree.add(sid("c"), "C", sid("b"));
      const ancestors = tree.getAncestors(sid("c"));
      expect(ancestors).toHaveLength(2);
      expect(ancestors[0]!.id).toBe("a");
      expect(ancestors[1]!.id).toBe("b");
    });

    it("handles broken parent reference gracefully", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("orphan"), "Orphan", sid("ghost")); // ignored
      expect(tree.getAncestors(sid("orphan"))).toEqual([]);
    });
  });

  describe("setActive", () => {
    it("sets a node as active", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("s1"), "S1");
      tree.setActive(sid("s1"));
      expect(tree.get(sid("s1"))!.isActive).toBe(true);
    });

    it("deactivates previous active node", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      tree.add(sid("b"), "B");
      tree.setActive(sid("a"));
      tree.setActive(sid("b"));
      expect(tree.get(sid("a"))!.isActive).toBe(false);
      expect(tree.get(sid("b"))!.isActive).toBe(true);
    });

    it("is no-op for nonexistent node", () => {
      const tree = new InMemorySessionTree();
      tree.setActive(sid("ghost"));
      expect(tree.getSnapshot().activeSessionId).toBeNull();
    });

    it("emits node.activated event", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("s1"), "S1");
      const fn = vi.fn();
      tree.onEvent(fn);
      tree.setActive(sid("s1"));
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: "node.activated" }));
    });
  });

  describe("setTitle", () => {
    it("updates node title", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("s1"), "Old");
      tree.setTitle(sid("s1"), "New");
      expect(tree.get(sid("s1"))!.title).toBe("New");
    });

    it("is no-op for nonexistent node", () => {
      const tree = new InMemorySessionTree();
      tree.setTitle(sid("ghost"), "X");
    });

    it("emits node.title_changed event", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("s1"), "T");
      const fn = vi.fn();
      tree.onEvent(fn);
      tree.setTitle(sid("s1"), "New");
      expect(fn).toHaveBeenCalledWith(expect.objectContaining({ type: "node.title_changed" }));
    });
  });

  describe("getSnapshot", () => {
    it("returns all nodes in traversal order", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      tree.add(sid("b"), "B", sid("a"));
      tree.add(sid("c"), "C", sid("a"));
      const snap = tree.getSnapshot();
      expect(snap.nodes).toHaveLength(3);
    });

    it("sets rootId when single root", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      const snap = tree.getSnapshot();
      expect(snap.rootId).toBe("a");
    });

    it("sets rootId to null when multiple roots", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      tree.add(sid("b"), "B");
      const snap = tree.getSnapshot();
      expect(snap.rootId).toBeNull();
    });

    it("includes activeSessionId", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("s1"), "S1");
      tree.setActive(sid("s1"));
      expect(tree.getSnapshot().activeSessionId).toBe("s1");
    });
  });

  describe("onEvent", () => {
    it("allows unsubscribe", () => {
      const tree = new InMemorySessionTree();
      const fn = vi.fn();
      const unsub = tree.onEvent(fn);
      unsub();
      tree.add(sid("s1"), "S1");
      expect(fn).not.toHaveBeenCalled();
    });

    it("isolates listener errors", () => {
      const tree = new InMemorySessionTree();
      tree.onEvent(() => { throw new Error("boom"); });
      tree.add(sid("s1"), "S1");
      expect(tree.getRoots()).toHaveLength(1);
    });
  });

  describe("complex scenarios", () => {
    it("builds a tree and retrieves nested children", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("root"), "Root");
      tree.add(sid("a"), "A", sid("root"));
      tree.add(sid("b"), "B", sid("root"));
      tree.add(sid("a1"), "A1", sid("a"));

      const root = tree.get(sid("root"))!;
      expect(root.children).toHaveLength(2);
      expect(root.children[0]!.children).toHaveLength(1);
      expect(root.children[0]!.children[0]!.id).toBe("a1");
    });

    it("multiple moves maintain tree integrity", () => {
      const tree = new InMemorySessionTree();
      tree.add(sid("a"), "A");
      tree.add(sid("b"), "B");
      tree.add(sid("c"), "C", sid("a"));
      tree.move(sid("c"), sid("b"));
      tree.move(sid("b"), sid("a"));
      expect(tree.get(sid("c"))!.parentId).toBe("b");
      expect(tree.get(sid("b"))!.parentId).toBe("a");
    });
  });
});
