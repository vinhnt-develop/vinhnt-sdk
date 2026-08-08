# VNT Agent — Refactoring Plan: OpenCode Alignment

## Current Structure (14 directories + index.ts)

```
agent-core/src/
├── agent/          (19 files)   — Kernel, parsers, plugins, tools, state-machine
├── contracts/      (20 files)   — Branded types, events, errors, Zod schemas, type guards
│   ├── schema/     (7 files)    — Zod runtime validators
│   └── schemas/    (3 files)    — Type guard utilities (isAgentId, etc.)
├── fakes/          (7 files)    — Shared test fakes
├── knowledge/      (13 files)   — Learning engine, memory, compression
├── lsp/            (9 files)    — LSP client, pool, tools
├── permission/     (8 files)    — Service, types, checkers, stores
├── plugin/         (2 files)    — Plugin types + barrel
├── rag/            (10 files)   — RAG search, indexer, chunker
├── session/        (7 files)    — Session state, stores, tree, coordinator
├── system-context/ (7 files)    — Context sources
├── tool/           (20 files)   — Tool runtime, registry, safety/, 13 tool files
├── util/           (11 files)   — Junk drawer: model-provider, compactor, etc.
├── workspace/      (1 file)     — WorkspaceManager
└── index.ts        (166 lines)  — Barrel re-exporting everything
```

## Directory-by-Directory Comparison: VNT vs OpenCode

### 1. agent/ (VNT) vs agent.ts (OpenCode)

| VNT (19 files, 1 dir) | OpenCode (1 file) | Analysis |
|------------------------|-------------------|----------|
| `kernel.ts` (1276 lines) | `agent.ts` (AgentV2) | Both are the main agent runtime. VNT's kernel.ts is the largest file — could be split OR kept as is. OpenCode keeps agent in 1 file (~800 lines) |
| `agent-factory.ts` | inline in agent.ts | Factory logic is embedded in OpenCode's AgentV2 |
| `agent-parser.ts` | N/A | OpenCode doesn't have agent markdown parsing — uses JSON config |
| `agent-registry.ts` | N/A | OpenCode doesn't have explicit agent registry; agents are stored in sessions |
| `plugin-manager.ts` | `plugin.ts` | OpenCode has separate plugin.ts |
| `execution-engine.ts` | inline in agent.ts | Execution is part of AgentV2 |
| `state-machine.ts` | inline in agent.ts | State transitions in AgentV2 |
| 7 tool files | `skill.ts`, `todowrite.ts` | VNT has agent-specific tools; OpenCode has them in tool/ |
| `skill-*.ts` (3 files) | `skill.ts` | OpenCode has skill.ts as single file |
| `yaml-frontmatter.ts` | N/A | OpenCode uses JSON |

**Verdict**: VNT's agent/ is reasonable for its complexity. Could consolidate some minor files but not urgent.

### 2. contracts/ (VNT) vs inline types + schema package (OpenCode)

| VNT (20 files, 1 dir) | OpenCode | Analysis |
|------------------------|----------|----------|
| `branded.ts` | inline in each module | OpenCode puts branded IDs inline where used |
| `events.ts` | `event/` dir | OpenCode has richer event system |
| `errors/` (5 files) | inline | OpenCode uses Effect for errors |
| `schema/` (7 Zod files) | `packages/schema/` | OpenCode has separate package for schemas |
| `schemas/` (type guards) | inline in branded files | OpenCode co-locates with types |
| Remaining type files (8) | inline in service files | OpenCode co-locates types |

**Verdict**: `contracts/` is OK as a package concept (types are imported by all packages). But `schema/` vs `schemas/` dual dirs must be merged.

### 3. permission/ (VNT) vs permission.ts + policy.ts (OpenCode)

| VNT (8 files) | OpenCode (3 files) | Analysis |
|----------------|--------------------|----------|
| `types.ts` | inline in `permission.ts` | OpenCode co-locates types |
| `service-types.ts` | inline in `permission.ts` | OpenCode inlines the interface |
| `service.ts` (232 lines) | `permission.ts` (main) | Core permission service |
| `checker.ts` | `policy.ts` | Pattern matching — OpenCode separates policy from permission |
| `evaluator.ts` | inline in `policy.ts` | Pattern evaluation in policy |
| `approval-store.ts` | `permission/saved.ts` | Saved rules persistence |
| `permission-store.ts` | `permission/saved.ts` | Same concern |
| `in-memory-approval-store.ts` | N/A (no test helpers) | Test implementation |

**Verdict**: VNT has too many granular files. Can consolidate to 3 files:
- `permission.ts` — types + interface + DefaultPermissionService
- `permission/policy.ts` — pattern matching (evaluator + checker)
- `permission/saved.ts` — approval store + permission store interfaces + in-memory impl

### 4. session/ (VNT) vs session/ (OpenCode)

| VNT (7 files) | OpenCode (15+ files) | Analysis |
|----------------|-----------------------|----------|
| `run-store.ts` | `session/store.ts` | Store interface |
| `session-store.ts` | `session/store.ts` | Same concern |
| `session-state.ts` | inline in runner | Runtime state |
| `in-memory-session-state.ts` | N/A | Test impl |
| `session-tree.ts` | N/A | OpenCode uses flat session list |
| `run-coordinator.ts` | `session/runner/` | OpenCode has richer runner dir |
| `title.ts` | inline in session.ts | Minor utility |

**Verdict**: VNT's session/ is simpler than OpenCode's. The tree concept is unique. Consolidate run-store.ts + session-store.ts into `session/store.ts`. The rest is fine.

### 5. tool/ (VNT) vs tool/ (OpenCode)

| VNT (20 files) | OpenCode (16+ files) | Analysis |
|----------------|----------------------|----------|
| `definitions.ts` | `tool.ts` | Tool.Definition type |
| `context.ts` | inline in `tool.ts` | Tool context |
| `tool-registry-types.ts` | `registry.ts` | Interface |
| `registry.ts` | `registry.ts` | Implementation |
| `in-memory-tool-registry.ts` | N/A | Test impl |
| `runtime.ts` | inline | Settle/dispatch logic |
| `bridge.ts` | inline | Kernel bridge |
| `policy.ts` | `tool/tool.ts` (withPermission) | Permission on tools |
| `sandbox.ts` | N/A | Unique to VNT |
| `safety/` (4 files) | inline in tool files | OpenCode doesn't have safety/ |
| 8 individual tool files | 13 individual tool files | Both similar |

**Verdict**: VNT's tool/ is well-structured. Key improvements:
- Flatten `safety/` → `tool/file-history.ts`, `tool/read-tracker.ts`, `tool/diff.ts`, `tool/history-hook.ts`
- Merge `tool-registry-types.ts` + `registry.ts` + `in-memory-tool-registry.ts` into `registry.ts`

### 6. util/ (VNT) — doesn't exist in OpenCode

| File | Should be in |
|------|-------------|
| `model-provider.ts` | `model.ts` (new standalone file) |
| `model-registry.ts` | `model.ts` (merge with provider) |
| `in-memory-model-registry.ts` | `model.ts` (merge) |
| `conversation-compactor.ts` | `session/compaction.ts` |
| `file-history.ts` | `tool/file-history.ts` |
| `retriever.ts` | `rag/retriever.ts` (already exists — check if duplicate) |
| `system-context.ts` | keep in `system-context/types.ts` |
| `json-schema.ts` | keep in `tool/definitions.ts` |
| `wildcard.ts` | `permission/policy.ts` or `util/wildcard.ts` (ok as utility) |

**Verdict**: `util/` must be eliminated. Each file goes to its natural home.

### 7. plugin/ (VNT) vs plugin.ts (OpenCode)

**Verdict**: Single file `plugin/` → `plugin.ts`. Only has `types.ts` + barrel. Flat to root level.

### 8. workspace/ (VNT) vs workspace.ts (OpenCode)

**Verdict**: Single file in dir → `workspace.ts`. Move up.

### 9. fakes/ (VNT) — doesn't exist in OpenCode

**Verdict**: Move to `test/fakes/` or remove. OpenCode doesn't share test helpers.

### 10. knowledge/ + rag/ + lsp/ + system-context/ — VNT specific

These are well-organized domain packages. No major restructuring needed, just minor cleanups.

---

## Refactoring Phases

### Phase A: Eliminate util/ (P0)
| Task | Files affected | Build impact |
|------|---------------|--------------|
| A1 | Create `model.ts` — merge model-provider, model-registry, in-memory-model-registry | 30+ imports |
| A2 | Move conversation-compactor → `session/compaction.ts` | 5 imports |
| A3 | Move file-history → `tool/file-history.ts` (merge with safety/file-history) | 4 imports |
| A4 | Move retriever → `rag/retriever.ts` (merge with existing) | 4 imports |
| A5 | Move system-context → `system-context/types.ts` | 5 imports |
| A6 | Move json-schema → `tool/json-schema.ts` | 3 imports |
| A7 | Delete util/ directory | 0 |

### Phase B: Flatten single-file dirs (P0)
| Task | Files affected | Build impact |
|------|---------------|--------------|
| B1 | `plugin/` → `plugin.ts` (merge types + move up) | 15 imports |
| B2 | `workspace/` → `workspace.ts` (move up) | 3 imports |
| B3 | `fakes/` → `test/fakes/` (not compiled to dist, needs approach) | 9 imports |

### Phase C: Consolidate permission/ (P1)
| Task | Files affected | Build impact |
|------|---------------|--------------|
| C1 | Merge `types.ts` into `service-types.ts` | 10 imports |
| C2 | Merge `checker.ts` + `evaluator.ts` → `policy.ts` | 6 imports |
| C3 | Merge `approval-store.ts` + `permission-store.ts` + `in-memory-approval-store` → `saved.ts` | 6 imports |
| C4 | Permission directory reduced from 8 files → 4 files | 0 |

### Phase D: Flatten tool/safety/ (P1)
| Task | Files affected | Build impact |
|------|---------------|--------------|
| D1 | Move safety/ files to tool/ | 6 imports |

### Phase E: Merge dual schemas dirs (P1)
| Task | Files affected | Build impact |
|------|---------------|--------------|
| E1 | Merge type guards into branded.ts + contracts/index.ts | 3 imports |
| E2 | Delete contracts/schemas/ | 0 |

### Phase F: Remove barrel index.ts (P2)
| Task | Files affected | Build impact |
|------|---------------|--------------|
| F1 | Replace barrel with module-level `export * as X` | all consumers |

### Phase G: Consolidate session/ stores (P2)
| Task | Files affected | Build impact |
|------|---------------|--------------|
| G1 | Merge `run-store.ts` + `session-store.ts` → `store.ts` | 10 imports |

### Phase H: Consolidate agent/ minor files (P2)
| Task | Files affected | Build impact |
|------|---------------|--------------|
| H1 | Merge kernel-error into kernel.ts | 3 imports |

---

## Execution Order

```
Phase A (eliminate util/)   → Build & Test ✅
Phase B (flatten dirs)       → Build & Test ✅
Phase C (consolidate perm.)  → Build & Test ✅
Phase D (flatten tool/)      → Build & Test ✅
Phase E (fix schemas)        → Build & Test ✅
Phase F (remove barrel)      → Build & Test ✅  [BIG CHANGE]
Phase G (session stores)     → Build & Test ✅
Phase H (agent minor)        → Build & Test ✅
```

Each phase must pass all 696 tests before proceeding.
